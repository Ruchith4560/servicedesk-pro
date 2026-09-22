import React, { useState, useEffect } from 'react';
import { TechnicianRoutingRank, Ticket } from '../../types/index.js';
import { Modal } from '../common/Modal.js';
import { ticketsApi } from '../../api/tickets.api.js';
import {
  Sparkles,
  UserCheck,
  Award
} from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner.js';

interface RoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onTicketAssigned: (updatedTicket: Ticket) => void;
}

export const RoutingModal: React.FC<RoutingModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onTicketAssigned
}) => {
  const [suggestions, setSuggestions] = useState<TechnicianRoutingRank[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen, ticket._id]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await ticketsApi.getRoutingSuggestions(ticket._id);
      setSuggestions(data);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch routing suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (technicianId: string, rationale: string) => {
    setAssigningId(technicianId);
    try {
      const updatedTicket = await ticketsApi.assignTicket(ticket._id, {
        assigneeId: technicianId,
        notes: `Assigned via Intelligent Routing: ${rationale}`
      });
      onTicketAssigned(updatedTicket);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  const handleAutoRoute = async () => {
    setAssigningId('auto');
    try {
      const res = await ticketsApi.autoRouteTicket(ticket._id);
      onTicketAssigned(res.ticket);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Auto-route failed');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Intelligent Technician Routing"
      subtitle="Evaluates skill relevance, queue workload balancing, and asset affinity."
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top summary banner & auto-route button */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-sky-950/20 border border-sky-800/40 text-sky-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-200">Algorithmic Match Engine Active</div>
              <div className="text-[11px] text-slate-400">
                Composite scoring: Skill Match (50%) + Workload (35%) + Asset Affinity (15%)
              </div>
            </div>
          </div>
          <button
            onClick={handleAutoRoute}
            disabled={assigningId !== null || suggestions.length === 0}
            className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-white flex items-center gap-1.5 transition shadow-lg shadow-sky-950 disabled:bg-slate-800 disabled:text-slate-600"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{assigningId === 'auto' ? 'Routing...' : 'Execute Auto-Route'}</span>
          </button>
        </div>

        {/* Suggestions list */}
        {isLoading ? (
          <LoadingSpinner message="Evaluating active technician profiles & workloads..." />
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono">
            No eligible active technicians found in the system.
          </div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {suggestions.map((rank, index) => {
              const isTop = index === 0;
              const isAssigning = assigningId === rank.technicianId;

              return (
                <div
                  key={rank.technicianId}
                  className={`p-4 rounded-xl border transition ${
                    isTop
                      ? 'bg-slate-900 border-sky-500/40 ring-1 ring-sky-500/20 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Candidate Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                            isTop
                              ? 'bg-sky-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <span className="font-bold text-slate-100 text-sm">{rank.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ({rank.department})
                        </span>
                        {isTop && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1 font-semibold">
                            <Award className="w-3 h-3" /> BEST FIT
                          </span>
                        )}
                      </div>

                      {/* Workload badge */}
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                        <span>
                          Active Queue:{' '}
                          <strong
                            className={
                              rank.activeTicketCount === 0
                                ? 'text-emerald-400'
                                : rank.activeTicketCount <= 2
                                ? 'text-slate-200'
                                : 'text-amber-400'
                            }
                          >
                            {rank.activeTicketCount} tickets
                          </strong>
                        </span>
                        <span>·</span>
                        <span>{rank.email}</span>
                      </div>

                      {/* Matched Skills Chips */}
                      {rank.matchedSkills.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">Matched:</span>
                          {rank.matchedSkills.map((sk, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono px-2 py-0.2 rounded bg-sky-950/50 text-sky-300 border border-sky-800/60"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Rationale */}
                      <p className="text-slate-400 text-[11px] leading-relaxed pt-1">
                        {rank.rationale}
                      </p>
                    </div>

                    {/* Scores & Assign Button */}
                    <div className="text-right space-y-2 flex-shrink-0">
                      <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 inline-block">
                        <div className="text-[10px] text-slate-500 font-mono uppercase">
                          Composite Score
                        </div>
                        <div className="text-base font-mono font-bold text-sky-400">
                          {rank.scores.compositeScore}
                          <span className="text-slate-500 text-xs">/100</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          S:{rank.scores.skillScore} | W:{rank.scores.workloadScore} | A:
                          {rank.scores.affinityScore}
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => handleAssign(rank.technicianId, rank.rationale)}
                          disabled={assigningId !== null}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition text-xs flex items-center gap-1.5 ml-auto"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                          <span>{isAssigning ? 'Assigning...' : 'Assign'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
