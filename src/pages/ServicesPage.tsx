import React, { useState, useEffect } from 'react';
import {
  ActivitySquare,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Service, Ward, ServiceStatus } from '../types/database.js';

const STATUSES: ServiceStatus[] = [
  'Active',
  'Needs Improvement',
  'Degraded',
  'Offline',
];

interface ServiceFormData {
  service_type: string;
  ward_id: string;
  coverage_percentage: string;
  satisfaction_percentage: string;
  status: ServiceStatus;
  reporting_period: string;
}

const emptyForm: ServiceFormData = {
  service_type: '',
  ward_id: '',
  coverage_percentage: '80',
  satisfaction_percentage: '75',
  status: 'Active',
  reporting_period: 'Q1 2026',
};

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesData, wardsData] = await Promise.all([
        apiRequest<Service[]>('/api/services'),
        apiRequest<Ward[]>('/api/wards'),
      ]);
      setServices(servicesData);
      setWards(wardsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingService(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (s: Service) => {
    setEditingService(s);
    setFormData({
      service_type: s.service_type,
      ward_id: s.ward_id || '',
      coverage_percentage: String(s.coverage_percentage),
      satisfaction_percentage: String(s.satisfaction_percentage),
      status: s.status,
      reporting_period: s.reporting_period || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.service_type.trim()) {
      setFormError('Service type is required');
      return;
    }

    const cov = Number(formData.coverage_percentage);
    const sat = Number(formData.satisfaction_percentage);

    if (isNaN(cov) || cov < 0 || cov > 100) {
      setFormError('Coverage percentage must be between 0 and 100');
      return;
    }

    if (isNaN(sat) || sat < 0 || sat > 100) {
      setFormError('Satisfaction percentage must be between 0 and 100');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        service_type: formData.service_type.trim(),
        ward_id: formData.ward_id || null,
        coverage_percentage: cov,
        satisfaction_percentage: sat,
        status: formData.status,
        reporting_period: formData.reporting_period.trim() || null,
      };

      if (editingService) {
        await apiRequest(`/api/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      await fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/services/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Needs Improvement':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Degraded':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Offline':
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Public Utilities & Services</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor civic coverage, citizen satisfaction, and public utility uptime
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Public Service
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="text-xs font-semibold underline ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading public service metrics...
          </div>
        ) : services.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ActivitySquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No services recorded</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Track drinking water, sanitation coverage, streetlighting, or health clinics.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Log First Service
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Service Type</th>
                  <th className="px-5 py-3.5">Ward Jurisdiction</th>
                  <th className="px-5 py-3.5">Coverage Level</th>
                  <th className="px-5 py-3.5">Citizen Satisfaction</th>
                  <th className="px-5 py-3.5">Operational Status</th>
                  <th className="px-5 py-3.5">Period</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {s.service_type}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {s.wards ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.wards.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">All Wards / Central</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, Number(s.coverage_percentage))}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">
                          {s.coverage_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              Number(s.satisfaction_percentage) >= 70
                                ? 'bg-emerald-500'
                                : Number(s.satisfaction_percentage) >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Number(s.satisfaction_percentage))}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">
                          {s.satisfaction_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${getStatusBadge(
                          s.status
                        )}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-500">
                      {s.reporting_period || '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {deleteConfirmId === s.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs hover:bg-slate-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit service"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(s.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-base">
                {editingService ? 'Update Public Service Record' : 'Log Public Service Metrics'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Service Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  placeholder="e.g. Potable Water Supply, Solid Waste Management"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Ward Jurisdiction
                </label>
                <select
                  value={formData.ward_id}
                  onChange={(e) => setFormData({ ...formData, ward_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">(Citywide / All Wards)</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Coverage % (0-100) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.coverage_percentage}
                    onChange={(e) => setFormData({ ...formData, coverage_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Satisfaction % (0-100) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.satisfaction_percentage}
                    onChange={(e) => setFormData({ ...formData, satisfaction_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ServiceStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Reporting Period
                  </label>
                  <input
                    type="text"
                    value={formData.reporting_period}
                    onChange={(e) => setFormData({ ...formData, reporting_period: e.target.value })}
                    placeholder="e.g. Q1 2026 / March 2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingService ? 'Update Service' : 'Record Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
