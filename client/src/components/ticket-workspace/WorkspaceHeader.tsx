import React, { useState } from 'react';
import { Ticket, User } from '../../types/index.js';
import { Badge } from '../common/Badge.js';
import {
  Clock,
  AlertTriangle,
  Flame,
  User as UserIcon,
  Sparkles,
  RefreshCw,
  PauseCircle,
  CheckCircle2
} from 'lucide-react';
import { ticketsApi } from '../../api/tickets.api.js';

interface WorkspaceHeaderProps {
  ticket: Ticket;
  onTicketUpdated: (updatedTicket: Ticket) => void;
  onOpenRoutingModal: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  ticket,
  onTicketUpdated,
  onOpenRoutingModal
}) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isAutoRouting, setIsAutoRouting] = useState(false);
  const [showFactors, setShowFactors] = useState(false);

  // Time remaining calculation
  const calculateRemainingTime = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr).getTime();
    const now = Date.now();
    const diffMs = deadline - now;

    if (diffMs <= 0) return { text: 'BREACHED', breached: true };
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${diffHours}h ${diffMinutes}m remaining`, breached: false };
  };

  const resolutionCountdown = calculateRemainingTime(ticket.slaTimers.resolutionDeadline);

  const handleRecalculateRisk = async () => {
    setIsRecalculating(true);
    try {
      const riskScore = await ticketsApi.recalculateRisk(ticket._id);
      onTicketUpdated({ ...ticket, riskScore });
    } catch (err: any) {
      alert(err.message || 'Failed to recalculate risk');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleQuickAutoRoute = async () => {
    setIsAutoRouting(true);
    try {
      const res = await ticketsApi.autoRouteTicket(ticket._id);
      onTicketUpdated(res.ticket);
    } catch (err: any) {
      alert(err.message || 'Auto-route failed');
    } finally {
      setIsAutoRouting(false);
    }
  };

  const assigneeName =
    typeof ticket.assigneeId === 'object' && ticket.assigneeId
      ? (ticket.assigneeId as User).name
      : ticket.assigneeId
      ? 'Assigned'
      : 'Unassigned';

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Side: Ticket Number, Title, Status & Tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2.5 mb-1.5 flex-wrap gap-y-1">
            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              {ticket.ticketNumber}
            </span>
            <Badge variant="status" value={ticket.status} pulse={ticket.status === 'IN_PROGRESS'} />
            <Badge variant="priority" value={ticket.priority} pulse={ticket.priority === 'CRITICAL'} />
            <Badge variant="category" value={ticket.category} />
            {ticket.reopenCount > 0 && (
              <span className="text-[11px] font-mono text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded">
                REOPENED ({ticket.reopenCount}x)
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100 truncate tracking-tight">{ticket.title}</h2>
        </div>

        {/* Right Side: Risk Engine, SLA Timers & Assignee Widget */}
        <div className="flex items-center space-x-4 flex-wrap gap-y-2">
          {/* Multi-factor Risk Indicator */}
          <div className="relative">
            <div
              onClick={() => setShowFactors(!showFactors)}
              className="flex items-center space-x-2.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-xl cursor-pointer transition"
            >
              <div
                className={`p-1.5 rounded-lg ${
                  ticket.riskScore.score >= 75
                    ? 'bg-rose-500/20 text-rose-400'
                    : ticket.riskScore.score >= 50
                    ? 'bg-orange-500/20 text-orange-400'
                    : ticket.riskScore.score >= 25
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-mono uppercase">Risk Score</div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold font-mono text-sm text-slate-100">
                    {ticket.riskScore.score}
                    <span className="text-slate-500 text-xs">/100</span>
                  </span>
                  <Badge variant="risk" value={ticket.riskScore.level || 'LOW'} size="sm" />
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRecalculateRisk();
                }}
                disabled={isRecalculating}
                title="Recalculate Risk"
                className="text-slate-500 hover:text-sky-400 transition ml-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin text-sky-400' : ''}`} />
              </button>
            </div>

            {/* Contributing Factors Flyout */}
            {showFactors && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-200">Risk Factor Provenance</span>
                  <span className="text-[10px] font-mono text-slate-400">{ticket.riskScore.score} pts</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {ticket.riskScore.factors.map((f, i) => (
                    <div key={i} className="flex items-center space-x-2 text-slate-300 font-mono text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                  Calculated by deterministic risk engine v1.0
                </div>
              </div>
            )}
          </div>

          {/* SLA Clock Widget */}
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-xl flex items-center space-x-3">
            <div
              className={`p-1.5 rounded-lg ${
                ticket.slaTimers.resolutionBreached
                  ? 'bg-rose-500/20 text-rose-400'
                  : ticket.slaTimers.isPaused
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}
            >
              {ticket.slaTimers.isPaused ? (
                <PauseCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
                <span>Resolution SLA</span>
                {ticket.slaTimers.isPaused && (
                  <span className="text-amber-400 text-[9px] px-1 rounded bg-amber-500/10 border border-amber-500/20">
                    PAUSED
                  </span>
                )}
              </div>
              <div className="text-xs font-mono font-semibold">
                {ticket.slaTimers.resolutionBreached ? (
                  <span className="text-rose-400 flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-3 h-3" /> BREACHED
                  </span>
                ) : ticket.slaTimers.resolvedAt ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Met on time
                  </span>
                ) : resolutionCountdown ? (
                  <span className={resolutionCountdown.breached ? 'text-rose-400' : 'text-slate-200'}>
                    {resolutionCountdown.text}
                  </span>
                ) : (
                  <span className="text-slate-400">Standard Tier</span>
                )}
              </div>
            </div>
          </div>

          {/* Assignee & Routing Controls */}
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-xl flex items-center space-x-3">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-mono uppercase">Assigned Technician</div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>{assigneeName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 pl-1">
              <button
                onClick={onOpenRoutingModal}
                title="View Routing Suggestions"
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-medium transition"
              >
                Routing
              </button>
              <button
                onClick={handleQuickAutoRoute}
                disabled={isAutoRouting}
                title="Auto-Route to #1 Ranked Technician"
                className="px-2 py-1 rounded bg-sky-600/30 border border-sky-500/40 hover:bg-sky-600/50 text-sky-300 text-[11px] font-medium transition flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isAutoRouting ? 'Routing...' : 'Auto'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
