import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, TicketPriority, TicketCategory } from '../types/index.js';
import { ticketsApi } from '../api/tickets.api.js';
import { Badge } from '../components/common/Badge.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { Modal } from '../components/common/Modal.js';
import {
  Search,
  Plus,
  Flame,
  ArrowRight,
  Sparkles,
  Ticket as TicketIcon
} from 'lucide-react';

export const TicketsListPage: React.FC = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Create ticket modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newPriority, setNewPriority] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [selectedStatus, selectedPriority]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedPriority !== 'ALL') params.priority = selectedPriority;
      const data = await ticketsApi.getTickets(params);
      setTickets(data.tickets || []);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await ticketsApi.createTicket({
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: (newCategory || undefined) as TicketCategory,
        priority: (newPriority || undefined) as TicketPriority
      });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewCategory('');
      setNewPriority('');
      navigate(`/tickets/${created._id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 bg-slate-950 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <TicketIcon className="w-6 h-6 text-sky-400" />
            <span>Operational Ticket Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time queue with deterministic SLA tracking and intelligent routing.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-semibold text-xs text-white flex items-center gap-2 transition shadow-lg shadow-sky-950 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Report Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by SDP number, keyword, or summary..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING">WAITING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Tickets Table / List */}
      {isLoading ? (
        <LoadingSpinner message="Querying active tickets queue..." />
      ) : filteredTickets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <TicketIcon className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No Tickets Found</h3>
          <p className="text-xs text-slate-500">
            Try adjusting your search criteria or report a new support incident.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-800/80">
            {filteredTickets.map((t) => (
              <div
                key={t._id}
                onClick={() => navigate(`/tickets/${t._id}`)}
                className="p-4 hover:bg-slate-850/80 cursor-pointer transition flex items-center justify-between gap-4 group"
              >
                {/* Left ticket details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.2 rounded border border-sky-500/20">
                      {t.ticketNumber}
                    </span>
                    <Badge variant="status" value={t.status} />
                    <Badge variant="priority" value={t.priority} />
                    <Badge variant="category" value={t.category} />
                  </div>

                  <h3 className="font-semibold text-sm text-slate-200 group-hover:text-sky-400 transition truncate">
                    {t.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-1">{t.description}</p>
                </div>

                {/* Right risk & timer */}
                <div className="flex items-center space-x-4 flex-shrink-0 text-right">
                  {/* Risk Badge */}
                  <div className="hidden sm:block">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Risk</div>
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200 justify-end">
                      <Flame
                        className={`w-3.5 h-3.5 ${
                          t.riskScore?.score >= 75 ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      />
                      <span>{t.riskScore?.score || 10}</span>
                    </div>
                  </div>

                  {/* Open Arrow */}
                  <div className="p-2 rounded-lg bg-slate-800/60 text-slate-400 group-hover:text-slate-100 group-hover:bg-slate-700 transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Report New IT Incident"
        subtitle="AI microservice will automatically categorize and recommend routing."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Incident Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Cisco AnyConnect VPN handshake failure error 403"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Detailed Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide symptoms, error messages, and affected hardware/software..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Category Override (Optional)
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Auto-Detect via AI</option>
                <option value="HARDWARE">HARDWARE</option>
                <option value="SOFTWARE">SOFTWARE</option>
                <option value="NETWORK">NETWORK</option>
                <option value="ACCESS_IAM">ACCESS_IAM</option>
                <option value="SECURITY">SECURITY</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Priority Override (Optional)
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Auto-Detect via AI</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-sky-950"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating & Triage...' : 'Create Ticket'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
