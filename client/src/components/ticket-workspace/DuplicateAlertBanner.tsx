import React, { useState } from 'react';
import { Ticket, DuplicateMatchItem } from '../../types/index.js';
import { Copy, GitMerge, AlertOctagon, Link2, X } from 'lucide-react';

interface DuplicateAlertBannerProps {
  ticket: Ticket;
  duplicates: DuplicateMatchItem[];
  onCluster: (childId: string, reason?: string) => Promise<void>;
}

export const DuplicateAlertBanner: React.FC<DuplicateAlertBannerProps> = ({
  ticket,
  duplicates,
  onCluster
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isClustering, setIsClustering] = useState(false);

  // If this is already a child incident
  if (ticket.parentIncidentId) {
    const parentDisplay = typeof ticket.parentIncidentId === 'object'
      ? (ticket.parentIncidentId as any).ticketNumber || 'Parent Incident'
      : 'Parent Incident';

    return (
      <div className="bg-indigo-950/70 border-b border-indigo-800/60 px-4 py-2 flex items-center justify-between text-xs text-indigo-200">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong className="font-semibold text-indigo-100">Clustered Child Incident:</strong> Linked to master incident{' '}
            <span className="font-mono text-indigo-300 font-bold">{parentDisplay}</span>.
            Status and root cause resolutions will automatically cascade from the master incident.
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 text-[10px] font-mono border border-indigo-700/50">
          CASCADE-SYNC
        </span>
      </div>
    );
  }

  // If this ticket is a Major Incident
  if (ticket.isMajorIncident && ticket.duplicateTickets && ticket.duplicateTickets.length > 0) {
    return (
      <div className="bg-amber-950/60 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold text-amber-100">Major Incident Cluster:</strong> Operating as the master incident for{' '}
            <span className="font-bold text-amber-300">{ticket.duplicateTickets.length} clustered reporter ticket(s)</span>.
            Resolving this incident will auto-resolve all clustered child tickets.
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 text-[10px] font-mono border border-amber-700/50">
          MAJOR INCIDENT
        </span>
      </div>
    );
  }

  // If potential duplicates are detected
  if (duplicates.length > 0 && !isDismissed) {
    const topMatch = duplicates[0];
    const matchPercentage = Math.round(topMatch.similarityScore * 100);

    const handleClusterClick = async () => {
      setIsClustering(true);
      try {
        await onCluster(topMatch.id, `Clustered based on ${matchPercentage}% semantic match: ${topMatch.matchedTitle}`);
      } catch (err: any) {
        alert(err.message || 'Failed to cluster duplicate incident');
      } finally {
        setIsClustering(false);
      }
    };

    return (
      <div className="bg-amber-900/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <Copy className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="truncate">
            <span className="font-semibold text-amber-100">Semantic Duplicate Detected: </span>
            <span className="font-mono text-amber-300 font-bold">{topMatch.ticketId || 'SDP-TICKET'}</span>
            <span className="text-slate-300 mx-1.5">—</span>
            <span className="text-slate-200 truncate">{topMatch.matchedTitle}</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/40">
              {matchPercentage}% Match ({topMatch.matchLevel})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            onClick={handleClusterClick}
            disabled={isClustering}
            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-[11px] transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>{isClustering ? 'Clustering...' : 'Cluster into Master'}</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-200 transition rounded"
            title="Dismiss duplicate alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
