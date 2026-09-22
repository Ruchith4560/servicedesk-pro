import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileCode,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { auditApi, AuditQueryParams } from '../api/audit.api';
import { AuditEvent, AuditSeverity } from '../types';
import { useAuthStore } from '../store/auth.store';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AuditTrailPage: React.FC = () => {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | 'ALL'>('ALL');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('ALL');
  const [searchAction, setSearchAction] = useState<string>('');
  const [searchActor, setSearchActor] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Inspector Modal State
  const [inspectedEvent, setInspectedEvent] = useState<AuditEvent | null>(null);

  const isAuthorized = user?.role === 'SYSTEM_ADMIN' || user?.role === 'IT_MANAGER';

  const loadAuditEvents = async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params: AuditQueryParams = {
        page: currentPage,
        limit: 20
      };

      if (selectedSeverity !== 'ALL') {
        params.severity = selectedSeverity;
      }
      if (selectedResourceType !== 'ALL') {
        params.resourceType = selectedResourceType;
      }
      if (searchAction.trim()) {
        params.action = searchAction.trim();
      }
      if (searchActor.trim()) {
        params.actorEmail = searchActor.trim();
      }

      const res = await auditApi.getAuditEvents(params);
      setEvents(res.events || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || 'Failed to load system audit events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditEvents();
  }, [currentPage, selectedSeverity, selectedResourceType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadAuditEvents();
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-950/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Access Denied: Enterprise Audit Trail</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Compliance logs and security audit records are strictly restricted to{' '}
          <span className="text-rose-400 font-semibold">System Administrators</span> and{' '}
          <span className="text-purple-400 font-semibold">IT Managers</span> under SOC 2 and ISO 27001 regulatory requirements.
        </p>
        <div className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono">
          Current Role: {user?.role || 'UNAUTHENTICATED'}
        </div>
      </div>
    );
  }

  const getSeverityBadgeClass = (severity: AuditSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'WARN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'INFO':
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Enterprise Compliance & Audit Trail</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              IMMUTABLE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Append-only event log capturing administrative actions, state transitions, security events, and entity diffs.
          </p>
        </div>

        <button
          onClick={loadAuditEvents}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter and Query Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Action Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchAction}
              onChange={(e) => setSearchAction(e.target.value)}
              placeholder="Filter by action (e.g. TICKET_STATUS_CHANGED)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          {/* Actor Email Search */}
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchActor}
              onChange={(e) => setSearchActor(e.target.value)}
              placeholder="Actor email..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          {/* Resource Type Dropdown */}
          <div className="relative">
            <Layers className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedResourceType}
              onChange={(e) => {
                setSelectedResourceType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 appearance-none"
            >
              <option value="ALL">All Resource Types</option>
              <option value="Ticket">Tickets</option>
              <option value="Asset">Assets</option>
              <option value="KnowledgeArticle">Knowledge Base</option>
              <option value="User">User Accounts</option>
              <option value="Security">Security Events</option>
            </select>
          </div>

          {/* Submit Search */}
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Apply Filters</span>
          </button>
        </form>

        {/* Severity Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Severity:</span>
          {(['ALL', 'CRITICAL', 'WARN', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => {
                setSelectedSeverity(sev);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                selectedSeverity === sev
                  ? sev === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : sev === 'WARN'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <span className="text-xs text-slate-400">Querying append-only ledger...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 opacity-80" />
            <span>{error}</span>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <FileCode className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
            No audit records match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {events.map((ev) => (
                  <tr key={ev._id} className="hover:bg-slate-800/40 transition">
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(ev.timestamp).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getSeverityBadgeClass(
                          ev.severity
                        )}`}
                      >
                        {ev.severity}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {ev.action}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-200 font-medium">
                        {ev.actorEmail || 'System / Automated'}
                      </div>
                      {ev.actorIp && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          IP: {ev.actorIp}
                        </div>
                      )}
                    </td>

                    {/* Resource */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-semibold">
                          {ev.resourceType}
                        </span>
                        {ev.resourceId && (
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                            {ev.resourceId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Details Action */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setInspectedEvent(ev)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 font-medium transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Diff</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="text-slate-200 font-semibold">{meta.page}</span> of{' '}
              <span className="text-slate-200 font-semibold">{meta.totalPages}</span> (
              {meta.total} total events)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Event Inspector Modal */}
      {inspectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-sky-400" />
                <h3 className="font-semibold text-sm text-slate-100">Audit Record Inspector</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getSeverityBadgeClass(inspectedEvent.severity)}`}>
                  {inspectedEvent.severity}
                </span>
              </div>
              <button
                onClick={() => setInspectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Action</div>
                  <div className="font-mono text-slate-200 font-semibold">{inspectedEvent.action}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Resource</div>
                  <div className="text-slate-200 font-semibold">
                    {inspectedEvent.resourceType}{' '}
                    {inspectedEvent.resourceId && `(${inspectedEvent.resourceId})`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Actor</div>
                  <div className="text-slate-200 font-semibold truncate">
                    {inspectedEvent.actorEmail || 'System'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Timestamp</div>
                  <div className="text-slate-200 font-mono">
                    {new Date(inspectedEvent.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* State Changes Diff */}
              {inspectedEvent.changes ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>State Mutation Diff (Before / After)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-rose-400 uppercase">Before Mutation</div>
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-rose-300 font-mono text-[11px] overflow-x-auto max-h-56">
                        {JSON.stringify(inspectedEvent.changes.before || {}, null, 2)}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase">After Mutation</div>
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-56">
                        {JSON.stringify(inspectedEvent.changes.after || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-center">
                  No state mutation diff attached to this event.
                </div>
              )}

              {/* Client Network Telemetry */}
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Client Telemetry</div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                  <div>IP Address: <span className="text-slate-300">{inspectedEvent.actorIp || 'Internal / Local'}</span></div>
                  <div>User Agent: <span className="text-slate-300">{inspectedEvent.userAgent || 'API Direct'}</span></div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectedEvent(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
