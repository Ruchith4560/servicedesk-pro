import React, { useState } from 'react';
import { Ticket, WorkLog, TicketStatus, User } from '../../types/index.js';
import { Badge } from '../common/Badge.js';
import {
  Play,
  Pause,
  CheckCircle,
  RotateCcw,
  Clock,
  Plus,
  Briefcase
} from 'lucide-react';
import { ticketsApi } from '../../api/tickets.api.js';

interface ActionHubColProps {
  ticket: Ticket;
  workLogs: WorkLog[];
  onTicketUpdated: (updatedTicket: Ticket) => void;
  onOpenTransitionModal: (targetStatus: TicketStatus) => void;
  onOpenWorkLogModal: () => void;
}

export const ActionHubCol: React.FC<ActionHubColProps> = ({
  ticket,
  workLogs,
  onTicketUpdated,
  onOpenTransitionModal,
  onOpenWorkLogModal
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Calculate cumulative logged time
  const totalMinutes = workLogs.reduce((acc, log) => acc + (log.timeSpentMinutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  const handleDirectTransition = async (targetStatus: TicketStatus) => {
    setIsTransitioning(true);
    try {
      const updated = await ticketsApi.transitionTicket(ticket._id, { targetStatus });
      onTicketUpdated(updated);
    } catch (err: any) {
      alert(err.message || 'Transition failed');
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/30 border-r border-slate-800 p-5 space-y-6 overflow-y-auto">
      {/* FSM Workflow Controller */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Play className="w-3.5 h-3.5 text-sky-400" />
            <span>State Machine Controls</span>
          </h3>
          <Badge variant="status" value={ticket.status} />
        </div>

        {/* Transition Buttons Matrix */}
        <div className="space-y-2.5">
          {ticket.status === 'CLOSED' ? (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 font-mono">
              Terminal State: Ticket closed and immutable.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {/* Transitions from OPEN or TRIAGED */}
              {(ticket.status === 'OPEN' || ticket.status === 'TRIAGED') && (
                <button
                  onClick={() => handleDirectTransition('ASSIGNED')}
                  disabled={isTransitioning}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" /> Accept & Move to ASSIGNED
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400">&rarr;</span>
                </button>
              )}

              {/* Transitions from ASSIGNED */}
              {ticket.status === 'ASSIGNED' && (
                <button
                  onClick={() => handleDirectTransition('IN_PROGRESS')}
                  disabled={isTransitioning}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5" /> Start Work (IN PROGRESS)
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">&rarr;</span>
                </button>
              )}

              {/* Transitions from IN_PROGRESS */}
              {ticket.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={() => onOpenTransitionModal('WAITING')}
                    className="w-full py-2 px-3 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-xs font-semibold transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Pause className="w-3.5 h-3.5" /> Pause for Customer / Vendor (WAITING)
                    </span>
                    <span className="text-[10px] font-mono text-orange-400">Pauses SLA</span>
                  </button>

                  <button
                    onClick={() => onOpenTransitionModal('RESOLVED')}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve Incident (RESOLVED)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Stops SLA &rarr;</span>
                  </button>
                </>
              )}

              {/* Transitions from WAITING */}
              {ticket.status === 'WAITING' && (
                <button
                  onClick={() => handleDirectTransition('IN_PROGRESS')}
                  disabled={isTransitioning}
                  className="w-full py-2 px-3 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-semibold transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5" /> Resume Work (IN PROGRESS)
                  </span>
                  <span className="text-[10px] font-mono text-sky-400">Resumes SLA &rarr;</span>
                </button>
              )}

              {/* Transitions from RESOLVED */}
              {ticket.status === 'RESOLVED' && (
                <>
                  <button
                    onClick={() => handleDirectTransition('CLOSED')}
                    disabled={isTransitioning}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Confirm & Close Ticket (CLOSED)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">&rarr;</span>
                  </button>

                  <button
                    onClick={() => onOpenTransitionModal('REOPENED')}
                    className="w-full py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5" /> Reopen Incident (REOPENED)
                    </span>
                    <span className="text-[10px] font-mono text-rose-400">Requires Reason</span>
                  </button>
                </>
              )}

              {/* Transitions from REOPENED */}
              {ticket.status === 'REOPENED' && (
                <button
                  onClick={() => handleDirectTransition('IN_PROGRESS')}
                  disabled={isTransitioning}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5" /> Resume Work (IN PROGRESS)
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">&rarr;</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resolution Details Display (if resolved or closed) */}
      {ticket.resolutionSummary && (
        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800/30">
            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5 font-mono">
              <CheckCircle className="w-3.5 h-3.5" /> Resolution Record
            </span>
          </div>
          <p className="text-xs text-emerald-200/90 whitespace-pre-wrap leading-relaxed">
            {ticket.resolutionSummary}
          </p>
        </div>
      )}

      {/* Technician Work Log Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Work Log Ledger</span>
            </h3>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Total: <span className="text-sky-400 font-semibold">{totalHours}h {remainingMins}m</span> logged
            </div>
          </div>

          <button
            onClick={onOpenWorkLogModal}
            className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/30 hover:bg-sky-600/40 text-sky-300 text-xs font-medium transition flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Log Time</span>
          </button>
        </div>

        {/* Work log entries */}
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {workLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-mono">
              No work logged on this ticket yet.
            </div>
          ) : (
            workLogs.map((log) => {
              const techName =
                typeof log.technicianId === 'object' && log.technicianId
                  ? (log.technicianId as User).name
                  : 'Technician';

              return (
                <div
                  key={log._id}
                  className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200 text-[11px]">{techName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 border border-slate-700">
                        {log.activityType}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-sky-400">
                      {log.timeSpentMinutes} mins
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{log.description}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
