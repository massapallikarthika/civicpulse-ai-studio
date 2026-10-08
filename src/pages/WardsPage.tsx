import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Ward } from '../types/database.js';

interface WardFormData {
  name: string;
  code: string;
  description: string;
}

const emptyForm: WardFormData = {
  name: '',
  code: '',
  description: '',
};

export function WardsPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [formData, setFormData] = useState<WardFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchWards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Ward[]>('/api/wards');
      setWards(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const openCreateModal = () => {
    setEditingWard(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (ward: Ward) => {
    setEditingWard(ward);
    setFormData({
      name: ward.name,
      code: ward.code || '',
      description: ward.description || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Ward name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description.trim() || null,
      };

      if (editingWard) {
        await apiRequest(`/api/wards/${editingWard.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/wards', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      await fetchWards();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save ward');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/wards/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      await fetchWards();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete ward');
    }
  };

  const filteredWards = wards.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.code && w.code.toLowerCase().includes(search.toLowerCase())) ||
      (w.description && w.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Municipal Wards Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Territorial divisions, administrative boundaries, and governance jurisdictions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWards}
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
            <Plus className="w-4 h-4" /> Add New Ward
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchWards} className="text-xs font-semibold underline ml-4 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ward name, code (e.g. W-12), or description..."
          className="w-full text-sm bg-transparent outline-none placeholder-slate-400 text-slate-800"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer">
            Clear
          </button>
        )}
      </div>

      {/* Ward Cards / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading ward records...
          </div>
        ) : filteredWards.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No wards found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? 'Try adjusting your search criteria.' : 'Create your first municipal ward to begin managing complaints and projects.'}
            </p>
            {!search && (
              <button
                onClick={openCreateModal}
                className="mt-4 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Ward Now
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Ward Name</th>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWards.map((ward) => (
                  <tr key={ward.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {ward.name[0]}
                        </div>
                        {ward.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-600">
                      {ward.code ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {ward.code}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-md">
                      {ward.description || '—'}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(ward.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {deleteConfirmId === ward.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(ward.id)}
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
                            onClick={() => openEditModal(ward)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit ward"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(ward.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete ward"
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-base">
                {editingWard ? 'Edit Ward Details' : 'Add New Municipal Ward'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
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
                    Ward Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ward 12 - Shivaji Nagar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Ward Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. W-12"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description / Operational Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Key administrative details, population coverage, primary civic priorities..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
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
                  {submitting ? 'Saving...' : editingWard ? 'Update Ward' : 'Create Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
