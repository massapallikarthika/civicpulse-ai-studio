import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  FolderKanban,
  Coins,
  Activity,
  MapPin,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Building,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { DashboardMetrics } from '../types/database.js';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<DashboardMetrics>('/api/dashboard');
      setMetrics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const hasData =
    metrics &&
    (metrics.openComplaintsCount > 0 ||
      metrics.activeProjectsCount > 0 ||
      metrics.totalAllocatedBudget > 0 ||
      metrics.wardCount > 0 ||
      metrics.recentActivity.length > 0);

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Municipal Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time operational resource status, civic grievances, and service delivery performance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>

          <Link
            to="/ai-insights"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            AI Operational Insights
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchMetrics}
            className="text-xs font-semibold underline text-red-900 ml-4 hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Complaints */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Open Complaints
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '—' : metrics?.openComplaintsCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 ml-2">requiring resolution</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/complaints" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
              View Grievance Queue <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Projects
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '—' : metrics?.activeProjectsCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 ml-2">works in progress</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/projects" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
              Track Works Progress <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Budget Remaining */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Budget Remaining
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '—' : formatCurrency(metrics?.budgetRemaining || 0)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Spent: {formatCurrency(metrics?.totalSpentBudget || 0)}</span>
            <Link to="/resources" className="text-blue-600 font-medium hover:underline">
              Resources &rarr;
            </Link>
          </div>
        </div>

        {/* Service Coverage & Satisfaction */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Service Delivery
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '—' : `${metrics?.averageServiceCoverage ?? 0}%`}
            </span>
            <span className="text-xs text-slate-500">avg coverage</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Satisfaction: {metrics?.averageSatisfaction ?? 0}%</span>
            <Link to="/services" className="text-blue-600 font-medium hover:underline">
              Services &rarr;
            </Link>
          </div>
        </div>
      </div>

      {!loading && !hasData && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No records available yet.</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Begin by adding your municipal wards, logging citizen complaints, or setting department resource allocations.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/wards"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" /> Add First Ward
            </Link>
            <Link
              to="/complaints"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Register Complaint
            </Link>
            <Link
              to="/resources"
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Allocate Budget
            </Link>
          </div>
        </div>
      )}

      {/* Grid: Ward Performance & Resource Position */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ward Performance (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Ward Operational Performance</h2>
                <p className="text-xs text-slate-500">Civic grievance load and public service coverage per ward</p>
              </div>
              <Link to="/wards" className="text-xs text-blue-600 hover:underline font-medium">
                Manage Wards ({metrics?.wardCount || 0})
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Ward Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Open Complaints</th>
                    <th className="px-4 py-3">Active Works</th>
                    <th className="px-4 py-3">Service Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics?.wardPerformance && metrics.wardPerformance.length > 0 ? (
                    metrics.wardPerformance.map((wp) => (
                      <tr key={wp.wardId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {wp.wardName}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {wp.wardCode || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              wp.openComplaints > 3
                                ? 'bg-red-100 text-red-800'
                                : wp.openComplaints > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {wp.openComplaints}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{wp.activeProjects}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, wp.avgCoverage)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 font-medium">
                              {wp.avgCoverage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">
                        No ward records configured yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Resource Position (1 col) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Resource Position</h2>
                <p className="text-xs text-slate-500">Department budget utilization</p>
              </div>
              <Link to="/resources" className="text-xs text-blue-600 hover:underline font-medium">
                View All
              </Link>
            </div>

            <div className="p-5 flex-1 space-y-4 overflow-y-auto max-h-[360px]">
              {metrics?.resourcePosition && metrics.resourcePosition.length > 0 ? (
                metrics.resourcePosition.map((res) => (
                  <div key={res.department} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                      <span>{res.department}</span>
                      <span className="text-slate-500 font-mono">
                        {formatCurrency(res.spent)} / {formatCurrency(res.allocated)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
                      <div
                        className={`h-2 rounded-full ${
                          res.utilizationPercent > 90
                            ? 'bg-rose-500'
                            : res.utilizationPercent > 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, res.utilizationPercent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{res.utilizationPercent}% utilized</span>
                      <span className="font-medium text-slate-700">
                        Remaining: {formatCurrency(res.remaining)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No department budget allocations registered.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Log */}
      {hasData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" /> Recent Municipal Activity
              </h2>
              <p className="text-xs text-slate-500">Audit trail of grievance and project updates</p>
            </div>
          </div>

          <div className="space-y-3">
            {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
              metrics.recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-slate-50/80 border border-slate-100 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-800">{act.description}</div>
                      <span className="text-[10px] uppercase font-mono text-slate-400">
                        {act.event_type} • {act.entity_type}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap ml-4">
                    {formatDateTime(act.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">No recent activity recorded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
