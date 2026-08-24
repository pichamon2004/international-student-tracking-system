'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { ModuleWithPermissions } from '@/types';
import toast from 'react-hot-toast';
import { RiPencilLine, RiDeleteBinLine } from 'react-icons/ri';

export default function ModulesPage() {
  const { hasPermission } = useAuthStore();

  const [modules, setModules]     = useState<ModuleWithPermissions[]>([]);
  const [loading, setLoading]     = useState(true);

  const [showCreate, setShowCreate]   = useState(false);
  const [newCode, setNewCode]         = useState('');
  const [newName, setNewName]         = useState('');
  const [viewOnly, setViewOnly]       = useState(false);
  const [creating, setCreating]       = useState(false);

  const [editingMod, setEditingMod]   = useState<ModuleWithPermissions | null>(null);
  const [editName, setEditName]       = useState('');
  const [saving, setSaving]           = useState(false);

  const [deletingId, setDeletingId]   = useState<number | null>(null);

  useEffect(() => { fetchModules(); }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles/modules');
      setModules(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const createModule = async () => {
    if (!newCode || !newName) return;
    setCreating(true);
    try {
      await api.post('/roles/modules', { code: newCode, name: newName, isViewOnly: viewOnly });
      toast.success('Module created');
      setShowCreate(false);
      setNewCode(''); setNewName(''); setViewOnly(false);
      fetchModules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const saveModule = async () => {
    if (!editingMod) return;
    setSaving(true);
    try {
      await api.put(`/roles/modules/${editingMod.id}`, { name: editName });
      toast.success('Module updated');
      setEditingMod(null);
      fetchModules();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/roles/modules/${id}`);
      toast.success('Module deleted');
      fetchModules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Something went wrong');
    } finally {
      setDeletingId(null);
    }
  };

  const canCreate = hasPermission('ROLE_MANAGEMENT.create');
  const canEdit   = hasPermission('ROLE_MANAGEMENT.edit');
  const canDelete = hasPermission('ROLE_MANAGEMENT.delete');

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Module Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Define modules and permissions used in the system</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition"
          >
            + Add Module
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-gray-600 font-medium bg-white border-b border-gray-100">#</th>
              <th className="text-left px-6 py-3 text-gray-600 font-medium bg-white border-b border-gray-100">Module Name</th>
              <th className="text-left px-6 py-3 text-gray-600 font-medium bg-white border-b border-gray-100">Code</th>
              <th className="px-6 py-3 text-center text-gray-600 font-medium bg-white border-b border-gray-100">Permissions</th>
              {(canEdit || canDelete) && (
                <th className="px-6 py-3 bg-white border-b border-gray-100" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading...</td>
              </tr>
            ) : modules.map((mod, idx) => (
              <tr key={mod.id} className="hover:bg-gray-50/60">
                <td className="px-6 py-3 text-gray-400">{idx + 1}</td>
                <td className="px-6 py-3 font-medium text-gray-800">{mod.name}</td>
                <td className="px-6 py-3 font-mono text-xs text-gray-500 bg-white/40">{mod.code}</td>
                <td className="px-6 py-3 bg-white/40">
                  <div className="flex flex-wrap justify-center gap-1">
                    {mod.permissions.map(p => (
                      <span key={p.id} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                        {p.method}
                      </span>
                    ))}
                  </div>
                </td>
                {(canEdit || canDelete) && (
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => { setEditingMod(mod); setEditName(mod.name); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <RiPencilLine size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => deleteModule(mod.id)}
                          disabled={deletingId === mod.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                        >
                          <RiDeleteBinLine size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Module */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Add New Module</h3>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Code <span className="text-red-500">*</span></label>
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. REPORT_MANAGEMENT"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Report Management"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={viewOnly}
                onChange={e => setViewOnly(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">View only (no create / edit / delete)</span>
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={createModule}
                disabled={creating || !newCode || !newName}
                className="px-5 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Module */}
      {editingMod && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Edit Module</h3>
            <p className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-2 rounded-lg">{editingMod.code}</p>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditingMod(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={saveModule}
                disabled={saving || !editName}
                className="px-5 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
