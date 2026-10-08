import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Building,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Resource } from '../types/database.js';
import { formatCurrency } from '../utils/formatters.js';

interface ResourceFormData {
  department: string;
  allocation_name: string;
  allocated_amount: string;
  spent_amount: string;
  fiscal_year: string;
  currency: string;
}

const emptyForm: ResourceFormData = {
  department: '',
  allocation_name: '',
  allocated_amount: '100000',
  spent_amount: '0',
  fiscal_year: 'FY 2026-27',
  currency: 'INR',
};

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Resource[]>('/api/resources');
      setResources(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financial allocations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const openCreateModal = () => {
    setEditingResource(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (r: Resource) => {
    setEditingResource(r);
    setFormData({
      department: r.department,
      allocation_name: r.allocation_name,
      allocated_amount: String(r.allocated_amount),
      spent_amount: String(r.spent_amount),
      fiscal_year: r.fiscal_year,
      currency: r.currency || 'INR',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.department.trim()) {
      setFormError('Department is required');
      return;
    }
    if (!formData.allocation_name.trim()) {
      setFormError('Allocation name is required');
      return;
    }

    const alloc = Number(formData.allocated_amount);
    const spent = Number(formData.spent_amount);

    if (isNaN(alloc) || alloc < 0) {
      setFormError('Allocated amount must be non-negative');
      return;
    }

    if (isNaN(spent) || spent < 0) {
      setFormError('Spent amount cannot be negative');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        department: formData.department.trim(),
        allocation_name: formData.allocation_name.trim(),
        allocated_amount: alloc,
        spent_amount: spent,
        fiscal_year: formData.fiscal_year.trim(),
        currency: formData.currency.trim() || 'INR',
      };

      if (editingResource) {
        await apiRequest(`/api/resources/${editingResource.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/resources', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      await fetchResources();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save resource allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/resources/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      await fetchResources();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
    }
  };

  const totalAllocated = resources.reduce((sum, r) => sum + (Number(r.allocated_amount) || 0), 0);
  const totalSpent = resources.reduce((sum, r) => sum + (Number(r.spent_amount) || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallUtilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Municipal Financial Resources</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Budget allocations, departmental expenditure, and treasury positions (INR formatting)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchResources}
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
            <Plus className="w-4 h-4" /> Add Budget Allocation
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchResources} className="text-xs font-semibold underline ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Aggregate Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Total Sanctioned Budget</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(totalAllocated)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Total Disbursed / Spent</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-2">
            {formatCurrency(totalSpent)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Available Treasury Balance</div>
          <div className={`text-2xl font-extrabold mt-2 ${totalRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {formatCurrency(totalRemaining)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Overall Expenditure Rate</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-2">
            {overallUtilization}%
          </div>
        </div>
      </div>

      {/* Resources Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading municipal financial records...
          </div>
        ) : resources.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Coins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No budget allocations found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Allocate funds to municipal departments (Roads, Public Health, Sanitation, Disaster Relief).
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Allocate Budget Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Allocation Name</th>
                  <th className="px-5 py-3.5">Fiscal Year</th>
                  <th className="px-5 py-3.5">Sanctioned (INR)</th>
                  <th className="px-5 py-3.5">Spent (INR)</th>
                  <th className="px-5 py-3.5">Remaining</th>
                  <th className="px-5 py-3.5">Utilization</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resources.map((r) => {
                  const alloc = Number(r.allocated_amount) || 0;
                  const spent = Number(r.spent_amount) || 0;
                  const rem = alloc - spent;
                  const util = alloc > 0 ? Math.round((spent / alloc) * 100) : 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {r.department}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-800">
                        {r.allocation_name}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-500">
                        {r.fiscal_year}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-900">
                        {formatCurrency(alloc, r.currency)}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">
                        {formatCurrency(spent, r.currency)}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold">
                        <span className={rem < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {formatCurrency(rem, r.currency)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                util > 90
                                  ? 'bg-rose-500'
                                  : util > 70
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, util)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{util}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {deleteConfirmId === r.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-xs text-red-600 font-medium">Delete?</span>
                            <button
                              onClick={() => handleDelete(r.id)}
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
                              onClick={() => openEditModal(r)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Edit allocation"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(r.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete allocation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
                {editingResource ? 'Update Department Budget' : 'Add Department Allocation'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Health & Sanitation"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Fiscal Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fiscal_year}
                    onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
                    placeholder="e.g. FY 2026-27"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Allocation / Head Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.allocation_name}
                  onChange={(e) => setFormData({ ...formData, allocation_name: e.target.value })}
                  placeholder="e.g. Monsoon Preparedness & De-silting Grant"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Allocated Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.allocated_amount}
                    onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Spent Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.spent_amount}
                    onChange={(e) => setFormData({ ...formData, spent_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
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
                  {submitting ? 'Saving...' : editingResource ? 'Update Allocation' : 'Add Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
