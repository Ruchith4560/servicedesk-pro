import React, { useState } from 'react';
import { Ticket, TicketEvent, User } from '../../types/index.js';
import {
  Lock,
  Send,
  Calendar,
  Tag,
  Activity,
  ArrowRight
} from 'lucide-react';
import { ticketsApi } from '../../api/tickets.api.js';

interface TicketTimelineColProps {
  ticket: Ticket;
  events: TicketEvent[];
  onEventAdded: (event: TicketEvent) => void;
}

export const TicketTimelineCol: React.FC<TicketTimelineColProps> = ({
  ticket,
  events,
  onEventAdded
}) => {
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requesterName =
    typeof ticket.requesterId === 'object' && ticket.requesterId
      ? (ticket.requesterId as User).name
      : 'Requester';
  const requesterEmail =
    typeof ticket.requesterId === 'object' && ticket.requesterId
      ? (ticket.requesterId as User).email
      : '';
  const requesterDept =
    typeof ticket.requesterId === 'object' && ticket.requesterId
      ? (ticket.requesterId as User).department
      : '';

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const event = await ticketsApi.addComment(ticket._id, {
        note: commentText.trim(),
        isInternal
      });
      onEventAdded(event);
      setCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border-r border-slate-800 p-5 space-y-6 overflow-y-auto">
      {/* Requester & Description Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
              {requesterName.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">{requesterName}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {requesterDept ? `${requesterDept} · ` : ''}
                {requesterEmail}
              </div>
            </div>
          </div>
          <div className="flex items-center text-[10px] text-slate-500 font-mono gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatTimestamp(ticket.createdAt)}</span>
          </div>
        </div>

        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
          Issue Description
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
          {ticket.description}
        </p>

        {/* Tags */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3 h-3 text-slate-500" />
            {ticket.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Activity Timeline & Conversation Thread */}
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Timeline & Discussion</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-500">{events.length} entries</span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {events.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No timeline events recorded yet.
            </div>
          ) : (
            events.map((evt) => {
              const isComment = evt.eventType === 'COMMENT_ADDED';
              const actorName =
                typeof evt.actorId === 'object' && evt.actorId ? (evt.actorId as User).name : 'System';

              return (
                <div
                  key={evt._id}
                  className={`rounded-xl border p-3.5 text-xs transition ${
                    evt.isInternal
                      ? 'bg-amber-950/20 border-amber-800/40 text-amber-200/90'
                      : isComment
                      ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      {evt.isInternal ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                          <Lock className="w-2.5 h-2.5" /> INTERNAL NOTE
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-200 text-[11px]">{actorName}</span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">
                        · {evt.eventType.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTimestamp(evt.createdAt)}
                    </span>
                  </div>

                  {evt.note && (
                    <p className="whitespace-pre-wrap leading-relaxed text-[11px] mt-1">{evt.note}</p>
                  )}

                  {/* Transition detail badges */}
                  {evt.eventType === 'STATUS_CHANGE' && evt.previousValue && evt.newValue && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {evt.previousValue.status || evt.previousValue}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="px-1.5 py-0.5 rounded bg-sky-900/30 border border-sky-700 text-sky-300">
                        {evt.newValue.status || evt.newValue}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Comment Input Box */}
        <form onSubmit={handleSubmitComment} className="pt-3 border-t border-slate-800 space-y-2.5">
          <div className="relative">
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                isInternal
                  ? 'Add an internal note (visible only to IT technicians & managers)...'
                  : 'Reply to requester or post updates...'
              }
              className={`w-full rounded-xl bg-slate-950 border px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition ${
                isInternal
                  ? 'border-amber-700/50 focus:border-amber-500 focus:ring-amber-500/20'
                  : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
              }`}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="flex items-center gap-1 font-mono text-[11px] text-amber-400">
                <Lock className="w-3 h-3" /> Internal Note
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                isInternal
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:bg-slate-800 disabled:text-slate-600'
                  : 'bg-sky-600 hover:bg-sky-500 text-white disabled:bg-slate-800 disabled:text-slate-600'
              }`}
            >
              <Send className="w-3 h-3" />
              <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
