import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  MapPin,
  Calendar,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Project, Ward, ProjectStatus } from '../types/database.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

const STATUSES: ProjectStatus[] = [
  'Planning',
  'In Progress',
  'Delayed',
  'Completed',
  'On Hold',
];

interface ProjectFormData {
  name: string;
  department: string;
  ward_id: string;
  budget: string;
  amount_spent: string;
  progress: string;
  status: ProjectStatus;
  planned_deadline: string;
}

const emptyForm: ProjectFormData = {
  name: '',
  department: '',
  ward_id: '',
  budget: '0',
  amount_spent: '0',
  progress: '0',
  status: 'Planning',
  planned_deadline: '',
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectsData, wardsData] = await Promise.all([
        apiRequest<Project[]>('/api/projects'),
        apiRequest<Ward[]>('/api/wards'),
      ]);
      setProjects(projectsData);
      setWards(wardsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      department: project.department || '',
      ward_id: project.ward_id || '',
      budget: String(project.budget || 0),
      amount_spent: String(project.amount_spent || 0),
      progress: String(project.progress || 0),
      status: project.status,
      planned_deadline: project.planned_deadline || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Project name is required');
      return;
    }

    const budgetNum = Number(formData.budget);
    const spentNum = Number(formData.amount_spent);
    const progressNum = Number(formData.progress);

    if (isNaN(budgetNum) || budgetNum < 0) {
      setFormError('Budget must be a non-negative number');
      return;
    }

    if (isNaN(spentNum) || spentNum < 0) {
      setFormError('Amount spent must be a non-negative number');
      return;
    }

    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      setFormError('Progress must be between 0 and 100');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        department: formData.department.trim() || null,
        ward_id: formData.ward_id || null,
        budget: budgetNum,
        amount_spent: spentNum,
        progress: progressNum,
        status: formData.status,
        planned_deadline: formData.planned_deadline || null,
      };

      if (editingProject) {
        await apiRequest(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/projects', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      await fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'Planning':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Delayed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'On Hold':
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.department && p.department.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Municipal Development Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Capital infrastructure works, progress tracking, and budget utilization
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
            <Plus className="w-4 h-4" /> Add Development Project
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

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or department..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid / Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          Loading project portfolio...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-800 text-sm">No projects found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'No projects match your search.' : 'Initiate your first infrastructure work or project.'}
          </p>
          {!search && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const budget = Number(p.budget) || 0;
            const spent = Number(p.amount_spent) || 0;
            const remaining = budget - spent;
            const spendPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
            const progress = Number(p.progress) || 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(
                        p.status
                      )}`}
                    >
                      {p.status}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{p.name}</h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                    {p.department && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                        {p.department}
                      </span>
                    )}
                    {p.wards && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {p.wards.name}
                      </span>
                    )}
                  </div>

                  {/* Physical Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">Physical Progress</span>
                      <span className="text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="mt-4 bg-slate-50 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Budget:</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(budget)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount Spent:</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(spent)} ({spendPct}%)
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/70 pt-1">
                      <span className="text-slate-500 font-semibold">Remaining:</span>
                      <span
                        className={`font-bold ${
                          remaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Target: {formatDate(p.planned_deadline)}
                  </span>

                  {deleteConfirmId === p.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-base">
                {editingProject ? 'Update Development Project' : 'Create Development Project'}
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
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ring Road Drainage Overhaul Phase 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Public Works Dept"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
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
                    <option value="">(Citywide / No Ward)</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Total Budget (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Amount Spent (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.amount_spent}
                    onChange={(e) => setFormData({ ...formData, amount_spent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Progress (0-100%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Planned Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.planned_deadline}
                    onChange={(e) => setFormData({ ...formData, planned_deadline: e.target.value })}
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
                  {submitting ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
