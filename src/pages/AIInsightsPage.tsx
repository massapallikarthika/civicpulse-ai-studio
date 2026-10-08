import { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Gauge,
  RefreshCw,
  Info,
  ShieldCheck,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { AIInsight, InsightType } from '../types/database.js';
import { formatDate } from '../utils/formatters.js';

export function AIInsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'recommendation' | 'alert' | 'performance'>('all');

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = activeFilter !== 'all' ? `?type=${activeFilter}` : '';
      const data = await apiRequest<AIInsight[]>(`/api/ai/insights${typeParam}`);
      setInsights(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch AI insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [activeFilter]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setInfoMessage(null);
    try {
      const result = await apiRequest<{
        insufficientData: boolean;
        message?: string;
        insights: AIInsight[];
      }>('/api/ai/insights', {
        method: 'POST',
      });

      if (result.insufficientData) {
        setInfoMessage(
          result.message ||
            'Not enough municipal records are available to generate a reliable insight. Please add wards, complaints, projects, or resource allocations first.'
        );
      } else {
        await fetchInsights();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/ai/insights/${id}`, { method: 'DELETE' });
      await fetchInsights();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete insight');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type: InsightType) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'recommendation':
        return <Lightbulb className="w-5 h-5 text-amber-500" />;
      case 'performance':
        return <Gauge className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Mandatory Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-blue-50/90 border border-blue-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
        <div className="text-xs sm:text-sm text-blue-900 leading-relaxed">
          <strong className="font-semibold block sm:inline">Official Advisory: </strong>
          AI-generated decision support. Officers should verify information and use their judgement.
          Insights are derived strictly from real recorded complaints, project allocations, and service metrics.
        </div>
      </div>

      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            AI Operational Decision Support
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gemini analysis grounded strictly in verified municipal records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInsights}
            disabled={loading || generating}
            className="p-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Analyzing Municipal Records...' : 'Generate New Insights'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchInsights} className="text-xs font-semibold underline ml-4">
            Retry
          </button>
        </div>
      )}

      {infoMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Insufficient Data for Grounded Analysis</div>
            <div className="text-xs text-amber-800 mt-0.5">{infoMessage}</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 gap-6">
        <button
          onClick={() => setActiveFilter('all')}
          className={`pb-3 transition-colors cursor-pointer ${
            activeFilter === 'all'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'hover:text-slate-900'
          }`}
        >
          All Insights
        </button>
        <button
          onClick={() => setActiveFilter('recommendation')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'recommendation'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'hover:text-slate-900'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" /> Recommendations
        </button>
        <button
          onClick={() => setActiveFilter('alert')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'alert'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Operational Alerts
        </button>
        <button
          onClick={() => setActiveFilter('performance')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'performance'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'hover:text-slate-900'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" /> Performance Analytics
        </button>
      </div>

      {/* Insights Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          Fetching operational insights...
        </div>
      ) : insights.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-white rounded-xl border border-slate-200 p-6">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-base">No AI insights generated yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Click &ldquo;Generate New Insights&rdquo; to prompt the server-side Gemini model to evaluate
            your active municipal records, identify bottlenecks, and formulate actionable recommendations.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Generate Insights Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      {getTypeIcon(insight.type)}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {insight.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getSeverityBadge(
                        insight.severity
                      )}`}
                    >
                      {insight.severity} Severity
                    </span>
                    <button
                      onClick={() => handleDelete(insight.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Dismiss insight"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug mb-2">
                  {insight.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {insight.description}
                </p>

                {/* Recommendation box */}
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-lg p-3 text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider">
                    <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                    Operational Directive
                  </div>
                  <p className="text-slate-700 leading-normal">{insight.recommendation}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Decision Support Analysis</span>
                <span>{formatDate(insight.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
