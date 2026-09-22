import React, { useState, useEffect } from 'react';
import {
  analyticsApi,
  ExecutiveOverviewData,
  TechnicianWorkloadMetric,
  AssetFailureMetric
} from '../api/analytics.api.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Cpu,
  Users,
  Server,
  Layers,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const AnalyticsDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<ExecutiveOverviewData | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianWorkloadMetric[]>([]);
  const [assets, setAssets] = useState<AssetFailureMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsRefreshing(true);
    try {
      const [overviewData, techData, assetData] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getTechnicians(),
        analyticsApi.getAssets()
      ]);
      setOverview(overviewData);
      setTechnicians(techData);
      setAssets(assetData);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <LoadingSpinner message="Aggregating operational analytics & SLA telemetry..." size="lg" />
      </div>
    );
  }

  const s = overview?.summary;

  return (
    <div className="flex-1 bg-slate-950 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            <span>Operations & Management Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time SLA compliance, MTTR category benchmarks, queue workloads, and CMDB failure metrics.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          disabled={isRefreshing}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-2 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh KPIs'}</span>
        </button>
      </div>

      {/* Row 1: Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: SLA Compliance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 font-mono uppercase">
              SLA Compliance
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {s?.slaComplianceRate ?? 100}%
            </span>
            <span className="text-[10px] font-mono text-slate-500">Target: 95%</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            {s?.breachedTickets ? (
              <span className="text-rose-400 font-mono text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {s.breachedTickets} breached incident(s)
              </span>
            ) : (
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Zero SLA breaches
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Mean Time to Resolution (MTTR) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 font-mono uppercase">
              Overall MTTR
            </span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-sky-400">
              {s?.overallMTTRHours ?? 0}
              <span className="text-sm font-normal text-slate-500"> hrs</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Across {s?.resolvedTickets ?? 0} resolved incidents
          </div>
        </div>

        {/* KPI 3: Queue Saturation & Risk */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 font-mono uppercase">
              Active Queue Load
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">
              {s?.activeTickets ?? 0}
            </span>
            <span className="text-[10px] font-mono text-slate-500">in flight</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-400 font-mono flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{s?.atRiskTickets ?? 0} flagged as high/critical risk</span>
          </div>
        </div>

        {/* KPI 4: AI Zero-Touch Triage Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 font-mono uppercase">
              AI Auto-Triage Rate
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-purple-400">
              {s?.aiAutoEnrichmentRate ?? 0}%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Zero-shot ML category & priority classification
          </div>
        </div>
      </div>

      {/* Row 2: Category MTTR Comparison & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MTTR by Category (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span>Mean Time to Resolution (MTTR) by Category</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Net operational hours to resolve incidents (excluding SLA pause states).
              </p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {overview?.mttrByCategory.map((item) => {
              const maxHour = Math.max(...overview.mttrByCategory.map((x) => x.mttrHours), 8);
              const pct = Math.min(100, Math.round((item.mttrHours / maxHour) * 100));

              return (
                <div key={item.category} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 font-mono">{item.category}</span>
                    <span className="text-slate-400 font-mono">
                      <strong className="text-sky-400">{item.mttrHours} hrs</strong> (
                      {item.ticketCount} tickets)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.category === 'SECURITY'
                          ? 'bg-rose-500'
                          : item.category === 'NETWORK'
                          ? 'bg-cyan-500'
                          : item.category === 'HARDWARE'
                          ? 'bg-amber-500'
                          : item.category === 'ACCESS_IAM'
                          ? 'bg-violet-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority & Status Distributions (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Queue Distribution Matrices</span>
            </h3>
          </div>

          {/* Priority Breakdown */}
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">
              Tickets by Priority
            </div>
            <div className="grid grid-cols-2 gap-2">
              {overview?.priorityDistribution.map((p) => (
                <div
                  key={p.priority}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <span
                    className={`font-mono font-bold text-[11px] ${
                      p.priority === 'CRITICAL'
                        ? 'text-rose-400'
                        : p.priority === 'HIGH'
                        ? 'text-amber-400'
                        : p.priority === 'MEDIUM'
                        ? 'text-sky-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {p.priority}
                  </span>
                  <span className="font-mono text-slate-200 font-bold">{p.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">
              Tickets by Workflow Status
            </div>
            <div className="grid grid-cols-2 gap-2">
              {overview?.statusDistribution
                .filter((st) =>
                  ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'].includes(
                    st.status
                  )
                )
                .map((st) => (
                  <div
                    key={st.status}
                    className="p-2 rounded bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-[11px]"
                  >
                    <span className="text-slate-400 font-mono">{st.status}</span>
                    <span className="font-mono text-slate-200 font-semibold">{st.count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Technician Workload Capacity & CMDB Asset Reliability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Technician Workload Balance Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Technician Queue Saturation & Effort</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Concurrent active tickets and cumulative engineering work logs.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[10px] text-slate-500 font-mono uppercase">
                <tr>
                  <th className="pb-2">Technician</th>
                  <th className="pb-2 text-center">Active</th>
                  <th className="pb-2 text-center">Resolved</th>
                  <th className="pb-2 text-right">Logged Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {technicians.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 font-mono">
                      No technician metrics recorded yet.
                    </td>
                  </tr>
                ) : (
                  technicians.map((t) => {
                    const hours = Math.floor(t.totalTimeLoggedMinutes / 60);
                    const mins = t.totalTimeLoggedMinutes % 60;

                    return (
                      <tr key={t.technicianId} className="hover:bg-slate-950/40 transition">
                        <td className="py-2.5">
                          <div className="font-semibold text-slate-200">{t.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{t.department}</div>
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                              t.activeTickets === 0
                                ? 'bg-slate-800 text-slate-400'
                                : t.activeTickets <= 2
                                ? 'bg-sky-500/15 text-sky-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {t.activeTickets}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-mono text-emerald-400 font-semibold">
                          {t.resolvedTickets}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-slate-300">
                          {hours}h {mins}m
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infrastructure Asset Reliability Matrix (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <span>Repeat Failure Assets (CMDB)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hardware & network devices with recurring incident tickets.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {assets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No asset failure history found.
              </div>
            ) : (
              assets.map((a) => (
                <div
                  key={a.assetId}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200 truncate">{a.name}</span>
                      {a.isCritical && (
                        <span className="text-[9px] font-mono px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          CRIT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {a.assetTag} · {a.type} · {a.location}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {a.incidentCount} incidents
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
