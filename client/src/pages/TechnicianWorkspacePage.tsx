import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ticket, TicketEvent, WorkLog, TicketStatus } from '../types/index.js';
import { ticketsApi } from '../api/tickets.api.js';
import { WorkspaceHeader } from '../components/ticket-workspace/WorkspaceHeader.js';
import { TicketTimelineCol } from '../components/ticket-workspace/TicketTimelineCol.js';
import { ActionHubCol } from '../components/ticket-workspace/ActionHubCol.js';
import { IntelligenceCol } from '../components/ticket-workspace/IntelligenceCol.js';
import { TransitionModal } from '../components/ticket-workspace/TransitionModal.js';
import { WorkLogModal } from '../components/ticket-workspace/WorkLogModal.js';
import { RoutingModal } from '../components/ticket-workspace/RoutingModal.js';
import { DuplicateAlertBanner } from '../components/ticket-workspace/DuplicateAlertBanner.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const TechnicianWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [transitionTarget, setTransitionTarget] = useState<TicketStatus | null>(null);
  const [isWorkLogOpen, setIsWorkLogOpen] = useState(false);
  const [isRoutingOpen, setIsRoutingOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicketData(id);
    }
  }, [id]);

  const loadTicketData = async (ticketId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ticketsApi.getTicketById(ticketId);
      setTicket(data.ticket);
      setEvents(data.events || []);
      setWorkLogs(data.workLogs || []);

      // Non-blocking duplicate detection query
      try {
        const dupData = await ticketsApi.getDuplicates(ticketId);
        setDuplicates(dupData.duplicates || []);
      } catch {
        setDuplicates([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketUpdated = (updated: Ticket) => {
    setTicket(updated);
    if (id) {
      loadTicketData(id);
    }
  };

  const handleEventAdded = (event: TicketEvent) => {
    setEvents((prev) => [event, ...prev]);
  };

  const handleTransitionSubmit = async (payload: any) => {
    if (!ticket) return;
    const updated = await ticketsApi.transitionTicket(ticket._id, payload);
    handleTicketUpdated(updated);
  };

  const handleWorkLogSubmit = async (payload: any) => {
    if (!ticket) return;
    const log = await ticketsApi.addWorkLog(ticket._id, payload);
    setWorkLogs((prev) => [log, ...prev]);
    if (id) {
      loadTicketData(id);
    }
  };

  const handleClusterTickets = async (childId: string, reason?: string) => {
    if (!ticket) return;
    const updated = await ticketsApi.clusterTickets(ticket._id, [childId], reason);
    handleTicketUpdated(updated);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <LoadingSpinner message="Loading high-density operational cockpit..." size="lg" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 w-12 h-12 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Unable to Load Ticket</h2>
        <p className="text-xs text-slate-400 font-mono">{error || 'Ticket not found'}</p>
        <button
          onClick={() => navigate('/tickets')}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Tickets Queue</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-950 text-slate-100">
      {/* Top Workspace Header */}
      <WorkspaceHeader
        ticket={ticket}
        onTicketUpdated={handleTicketUpdated}
        onOpenRoutingModal={() => setIsRoutingOpen(true)}
      />

      {/* Duplicate Incident & Cluster Banner */}
      <DuplicateAlertBanner
        ticket={ticket}
        duplicates={duplicates}
        onCluster={handleClusterTickets}
      />

      {/* Main 3-Column Cockpit Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Column 1: Context & Timeline (4 of 12 cols) */}
        <div className="lg:col-span-4 h-full overflow-hidden">
          <TicketTimelineCol
            ticket={ticket}
            events={events}
            onEventAdded={handleEventAdded}
          />
        </div>

        {/* Column 2: Action Hub & State Transitions (4 of 12 cols) */}
        <div className="lg:col-span-4 h-full overflow-hidden">
          <ActionHubCol
            ticket={ticket}
            workLogs={workLogs}
            onTicketUpdated={handleTicketUpdated}
            onOpenTransitionModal={(target) => setTransitionTarget(target)}
            onOpenWorkLogModal={() => setIsWorkLogOpen(true)}
          />
        </div>

        {/* Column 3: Intelligence, Asset & RAG Context (4 of 12 cols) */}
        <div className="lg:col-span-4 h-full overflow-hidden">
          <IntelligenceCol ticket={ticket} />
        </div>
      </div>

      {/* Modals */}
      <TransitionModal
        isOpen={transitionTarget !== null}
        onClose={() => setTransitionTarget(null)}
        targetStatus={transitionTarget}
        onSubmit={handleTransitionSubmit}
      />

      <WorkLogModal
        isOpen={isWorkLogOpen}
        onClose={() => setIsWorkLogOpen(false)}
        onSubmit={handleWorkLogSubmit}
      />

      <RoutingModal
        isOpen={isRoutingOpen}
        onClose={() => setIsRoutingOpen(false)}
        ticket={ticket}
        onTicketAssigned={handleTicketUpdated}
      />
    </div>
  );
};
