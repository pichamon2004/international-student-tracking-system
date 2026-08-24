'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { RoleDetail, ModuleWithPermissions } from '@/types';
import toast from 'react-hot-toast';
import { RiDeleteBin6Line, RiAlertLine, RiEditLine } from 'react-icons/ri';

const METHODS = ['view', 'create', 'edit', 'delete'] as const;
type Method = typeof METHODS[number];

const METHOD_LABELS: Record<Method, string> = {
  view:   'View',
  create: 'Create',
  edit:   'Edit',
  delete: 'Delete',
};

export default function RolesPage() {
  const { hasPermission } = useAuthStore();

  const [roles, setRoles]       = useState<RoleDetail[]>([]);
  const [modules, setModules]   = useState<ModuleWithPermissions[]>([]);
  const [selected, setSelected] = useState<RoleDetail | null>(null);
  const [checked, setChecked]   = useState<Set<number>>(new Set());
  const [saving, setSaving]     = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode]       = useState('');
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const [creating, setCreating]     = useState(false);

  // Edit modal state
  const [editTarget, setEditTarget]   = useState<RoleDetail | null>(null);
  const [editName, setEditName]       = useState('');
  const [editDesc, setEditDesc]       = useState('');
  const [editSaving, setEditSaving]   = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget]   = useState<RoleDetail | null>(null);
  const [deleteUserCount, setDeleteUserCount] = useState<number | null>(null);
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => { fetchRoles(); fetchModules(); }, []);

  const fetchRoles = async () => {
    const res = await api.get('/roles');
    const data: RoleDetail[] = res.data.data;
    setRoles(data);
    if (data.length > 0) selectRole(data[0]);
  };

  const fetchModules = async () => {
    const res = await api.get('/roles/modules');
    setModules(res.data.data);
  };

  const selectRole = async (role: RoleDetail) => {
    setSelected(role);
    const res = await api.get(`/roles/${role.id}/permissions`);
    const perms: { permission: { id: number } }[] = res.data.data.permissions;
    setChecked(new Set(perms.map(rp => rp.permission.id)));
  };

  const toggle = (permId: number) => {
    if (!hasPermission('ROLE_MANAGEMENT.edit')) return;
    setChecked(prev => {
      const next = new Set(prev);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return next;
    });
  };

  const toggleAllModule = (modulePermIds: number[]) => {
    if (!hasPermission('ROLE_MANAGEMENT.edit')) return;
    const allChecked = modulePermIds.every(id => checked.has(id));
    setChecked(prev => {
      const next = new Set(prev);
      modulePermIds.forEach(id => allChecked ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const savePermissions = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/roles/${selected.id}/permissions`, { permissionIds: Array.from(checked) });
      toast.success('Permissions saved');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!newCode || !newName) return;
    setCreating(true);
    try {
      await api.post('/roles', { code: newCode, name: newName, description: newDesc });
      toast.success('Role created');
      setShowCreate(false);
      setNewCode(''); setNewName(''); setNewDesc('');
      fetchRoles();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (role: RoleDetail) => {
    setEditTarget(role);
    setEditName(role.name);
    setEditDesc(role.description ?? '');
  };

  const saveEdit = async () => {
    if (!editTarget || !editName.trim()) return;
    setEditSaving(true);
    try {
      await api.put(`/roles/${editTarget.id}`, { name: editName, description: editDesc });
      toast.success('Role updated');
      setEditTarget(null);
      fetchRoles();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setEditSaving(false);
    }
  };

  const canEdit   = hasPermission('ROLE_MANAGEMENT.edit');
  const canCreate = hasPermission('ROLE_MANAGEMENT.create');
  const canDelete = hasPermission('ROLE_MANAGEMENT.delete');

  // Step 1: open confirm modal
  const openDelete = (role: RoleDetail) => {
    setDeleteTarget(role);
    setDeleteUserCount(null);
  };

  // Step 2: attempt delete (force=false first, then force=true if needed)
  const confirmDelete = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/roles/${deleteTarget.id}${force ? '?force=true' : ''}`);
      toast.success('Role deleted');
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      setDeleteUserCount(null);
      fetchRoles();
    } catch (err: any) {
      const count = err?.response?.data?.userCount;
      if (count !== undefined) {
        setDeleteUserCount(count); // show second stage modal
      } else {
        toast.error(err?.response?.data?.message ?? 'Something went wrong');
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 gap-6 overflow-hidden">

      {/* Left panel — role list */}
      <div className="w-64 flex-shrink-0 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Roles</h2>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              + New Role
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
          {roles.map(role => (
            <div
              key={role.id}
              className={`group relative w-full text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                selected?.id === role.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => selectRole(role)}
            >
              <p className="font-medium text-gray-800 pr-6">{role.name}</p>
              <p className="text-xs text-gray-400">{role.code}</p>
              {!role.isActive && <span className="text-xs text-red-400">Inactive</span>}

              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {canEdit && (
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(role); }}
                    className="p-1 rounded-md text-gray-300 hover:text-primary hover:bg-primary/10 transition-all"
                    title="Edit role"
                  >
                    <RiEditLine size={14} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={e => { e.stopPropagation(); openDelete(role); }}
                    className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete role"
                  >
                    <RiDeleteBin6Line size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — permission matrix */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a role to view permissions
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{selected.name}</h3>
                <p className="text-sm text-gray-400">{selected.code}</p>
              </div>
              {canEdit && (
                <button
                  onClick={savePermissions}
                  disabled={saving}
                  className="px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-600 font-medium bg-white border-b border-gray-100">Module</th>
                    {METHODS.map(m => (
                      <th key={m} className="px-4 py-3 text-center text-gray-600 font-medium w-24 bg-white border-b border-gray-100">
                        {METHOD_LABELS[m]}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-gray-600 font-medium w-20 bg-white border-b border-gray-100">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {modules.map(mod => {
                    const permMap: Partial<Record<Method, number>> = {};
                    mod.permissions.forEach(p => {
                      if (METHODS.includes(p.method as Method)) {
                        permMap[p.method as Method] = p.id;
                      }
                    });
                    const allIds     = Object.values(permMap).filter(Boolean) as number[];
                    const allChecked = allIds.length > 0 && allIds.every(id => checked.has(id));

                    return (
                      <tr key={mod.id} className="hover:bg-gray-50/60">
                        <td className="px-6 py-3 font-medium text-gray-700">{mod.name}</td>
                        {METHODS.map(m => {
                          const permId = permMap[m];
                          return (
                            <td key={m} className="px-4 py-3 text-center bg-white/50">
                              {permId ? (
                                <input
                                  type="checkbox"
                                  checked={checked.has(permId)}
                                  onChange={() => toggle(permId)}
                                  disabled={!canEdit}
                                  className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-default"
                                />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center bg-white/50">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={() => toggleAllModule(allIds)}
                            disabled={!canEdit || allIds.length === 0}
                            className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-default"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Delete Role */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-5">

            {deleteUserCount === null ? (
              /* Stage 1: simple confirm */
              <>
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-gray-800">Delete Role</h3>
                  <p className="text-sm text-gray-500">
                    Delete <span className="font-medium text-gray-800">{deleteTarget.name}</span>?
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => confirmDelete(false)}
                    disabled={deleting}
                    className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            ) : (
              /* Stage 2: role has users — warn and offer force delete */
              <>
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <RiAlertLine size={20} className="text-amber-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-gray-800">Role has active users</h3>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold text-amber-600">{deleteUserCount} user(s)</span>{' '}
                      are assigned this role.
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Proceeding will remove this role from all users. Users with no other roles will lose access.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setDeleteTarget(null); setDeleteUserCount(null); }}
                    disabled={deleting}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => confirmDelete(true)}
                    disabled={deleting}
                    className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : `Remove from all users & delete`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Role */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Edit Role</h3>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Code</label>
              <p className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 font-mono">
                {editTarget.code}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="e.g. Sub Staff"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={saveEdit}
                disabled={editSaving || !editName.trim()}
                className="px-5 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
              >
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Role */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Create New Role</h3>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Code <span className="text-red-500">*</span></label>
              <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUB_STAFF"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Sub Staff"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={createRole} disabled={creating || !newCode || !newName}
                className="px-5 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition disabled:opacity-50">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
