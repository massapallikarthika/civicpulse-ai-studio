import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import {
  Complaint,
  Ward,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '../types/database.js';
import { formatDate } from '../utils/formatters.js';

const CATEGORIES: ComplaintCategory[] = [
  'Water Supply',
  'Sanitation',
  'Roads & Lighting',
  'Healthcare',
  'Public Safety',
  'Other',
];

const PRIORITIES: ComplaintPriority[] = ['Critical', 'High', 'Medium', 'Low'];

const STATUSES: ComplaintStatus[] = [
  'Open',
  'Acknowledged',
  'In Progress',
  'Resolved',
  'Closed',
];

interface ComplaintFormData {
  title: string;
  description: string;
  category: ComplaintCategory;
  ward_id: string;
  responsible_department: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
}

const emptyForm: ComplaintFormData = {
  title: '',
  description: '',
  category: 'Water Supply',
  ward_id: '',
  responsible_department: '',
  priority: 'Medium',
  status: 'Open',
};

export function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [formData, setFormData] = useState<ComplaintFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (wardFilter !== 'all') params.append('ward_id', wardFilter);
      if (search.trim()) params.append('search', search.trim());
      params.append('sort', sortOrder);

      const [complaintsData, wardsData] = await Promise.all([
        apiRequest<Complaint[]>(`/api/complaints?${params.toString()}`),
        apiRequest<Ward[]>('/api/wards'),
      ]);

      setComplaints(complaintsData);
      setWards(wardsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter, priorityFilter, statusFilter, wardFilter, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openCreateModal = () => {
    setEditingComplaint(null);
    setFormData({
      ...emptyForm,
      ward_id: wards.length > 0 ? wards[0].id : '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setFormData({
      title: complaint.title,
      description: complaint.description || '',
      category: complaint.category,
      ward_id: complaint.ward_id || '',
      responsible_department: complaint.responsible_department || '',
      priority: complaint.priority,
      status: complaint.status,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('Complaint title is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        ward_id: formData.ward_id || null,
        responsible_department: formData.responsible_department.trim() || null,
        priority: formData.priority,
        status: formData.status,
      };

      if (editingComplaint) {
        await apiRequest(`/api/complaints/${editingComplaint.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/complaints', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      await fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/complaints/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete complaint');
    }
  };

  const getPriorityBadgeClass = (priority: ComplaintPriority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status: ComplaintStatus) => {
    switch (status) {
      case 'Open':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Acknowledged':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'In Progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Public Grievances & Complaints</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Log, prioritize, triage, and resolve citizen municipal service complaints
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
            <Plus className="w-4 h-4" /> Register Complaint
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search complaint title, description, or reference..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white"
            >
              <option value="all">All Priorities</option>
              {PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>{pr}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Ward Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Ward</label>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white"
            >
              <option value="all">All Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Sort</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading complaints...
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No complaints found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no grievances matching your active filter criteria.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Register Complaint
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Title & Details</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Ward</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-semibold text-slate-900">{c.title}</div>
                      {c.description && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">{c.description}</div>
                      )}
                      {c.responsible_department && (
                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          Dept: {c.responsible_department}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-700">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {c.wards ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.wards.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">All / Central</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityBadgeClass(
                          c.priority
                        )}`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${getStatusBadgeClass(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {deleteConfirmId === c.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(c.id)}
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
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit complaint"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(c.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete complaint"
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
                {editingComplaint ? 'Update Citizen Grievance' : 'Register Public Complaint'}
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
                  Complaint Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Pipeline leakage on 4th Main Street"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ComplaintCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Ward
                  </label>
                  <select
                    value={formData.ward_id}
                    onChange={(e) => setFormData({ ...formData, ward_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">(No specific ward / Citywide)</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} {w.code ? `(${w.code})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as ComplaintPriority })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {PRIORITIES.map((pr) => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ComplaintStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.responsible_department}
                    onChange={(e) => setFormData({ ...formData, responsible_department: e.target.value })}
                    placeholder="e.g. Water Board"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description / Citizen Details
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Citizen reported details, exact landmark, impact severity..."
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
                  {submitting ? 'Saving...' : editingComplaint ? 'Update Complaint' : 'Register Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
