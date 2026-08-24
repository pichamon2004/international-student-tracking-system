'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import toast from 'react-hot-toast';
import { RiPencilLine, RiUserAddLine, RiArrowDownSLine, RiCheckLine, RiSearchLine, RiCloseLine } from 'react-icons/ri';

interface UserRole {
  role: { id: number; code: string; name: string };
}

interface UserItem {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  userRoles: UserRole[];
}

interface RoleOption {
  id: number;
  code: string;
  name: string;
}

// ── Single-Select Filter Dropdown ─────────────────────────────────
function SimpleDropdown({
  value, onChange, placeholder, options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-36"
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        {value ? (
          <RiCloseLine
            size={14}
            className="ml-auto text-gray-400 hover:text-gray-600"
            onClick={e => { e.stopPropagation(); onChange(''); }}
          />
        ) : (
          <RiArrowDownSLine size={14} className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition text-left"
            >
              <span className={value === o.value ? 'text-primary font-medium' : 'text-gray-700'}>{o.label}</span>
              {value === o.value && <RiCheckLine size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Custom Multi-Select Dropdown ───────────────────────────────────
function RoleDropdown({
  roles,
  selectedIds,
  onChange,
}: {
  roles: RoleOption[];
  selectedIds: Set<number>;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = roles.filter(r => selectedIds.has(r.id));

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full min-h-[42px] flex items-center flex-wrap gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">Select role...</span>
        ) : (
          selected.map(r => (
            <span
              key={r.id}
              className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-medium"
            >
              {r.name}
              <span
                role="button"
                onClick={e => { e.stopPropagation(); onChange(r.id); }}
                className="text-primary/50 hover:text-red-500 transition cursor-pointer leading-none"
              >
                ×
              </span>
            </span>
          ))
        )}
        <RiArrowDownSLine
          size={16}
          className={`ml-auto flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {roles.map(r => {
            const isSelected = selectedIds.has(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onChange(r.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition text-left"
              >
                <div>
                  <span className="font-medium text-gray-800">{r.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{r.code}</span>
                </div>
                {isSelected && <RiCheckLine size={16} className="text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function UsersPage() {
  const { hasPermission } = useAuthStore();

  const [users, setUsers]       = useState<UserItem[]>([]);
  const [roles, setRoles]       = useState<RoleOption[]>([]);
  const [loading, setLoading]   = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  // Filter
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Create modal
  const [showCreate, setShowCreate]     = useState(false);
  const [newEmail, setNewEmail]         = useState('');
  const [newName, setNewName]           = useState('');
  const [newRoleIds, setNewRoleIds]     = useState<Set<number>>(new Set());
  const [creating, setCreating]         = useState(false);

  // Edit modal
  const [editUser, setEditUser]         = useState<UserItem | null>(null);
  const [editName, setEditName]         = useState('');
  const [editActive, setEditActive]     = useState(true);
  const [editRoleIds, setEditRoleIds]   = useState<Set<number>>(new Set());
  const [saving, setSaving]             = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err: any) {
      if (err?.response?.status === 403) setNoAccess(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchUsers(); fetchRoles(); }, [fetchUsers, fetchRoles]);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    if (filterRole && !u.userRoles.some(ur => ur.role.code === filterRole)) return false;
    if (filterStatus === 'active' && !u.isActive) return false;
    if (filterStatus === 'inactive' && u.isActive) return false;
    return true;
  });

  const toggleNewRole = (id: number) =>
    setNewRoleIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleEditRole = (id: number) =>
    setEditRoleIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const createUser = async () => {
    if (!newEmail || !newName || newRoleIds.size === 0) return;
    setCreating(true);
    try {
      const firstRole = roles.find(r => newRoleIds.has(r.id));
      const res = await api.post('/users', { email: newEmail, name: newName, role: firstRole?.code });
      const userId = res.data.data.id;

      // Add remaining roles (if more than 1)
      const remaining = Array.from(newRoleIds).filter(id => id !== firstRole?.id);
      for (const roleId of remaining) {
        await api.post(`/roles/users/${userId}/roles`, { roleId });
      }

      toast.success('User created');
      setShowCreate(false);
      setNewEmail(''); setNewName(''); setNewRoleIds(new Set());
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: UserItem) => {
    setEditUser(u);
    setEditName(u.name);
    setEditActive(u.isActive);
    setEditRoleIds(new Set(u.userRoles.map(ur => ur.role.id)));
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await api.put(`/users/${editUser.id}`, { name: editName, isActive: editActive });

      const originalIds = new Set(editUser.userRoles.map(ur => ur.role.id));

      // Add new roles
      for (const id of Array.from(editRoleIds)) {
        if (!originalIds.has(id)) {
          await api.post(`/roles/users/${editUser.id}/roles`, { roleId: id });
        }
      }
      // Remove roles that were unchecked
      for (const id of Array.from(originalIds)) {
        if (!editRoleIds.has(id)) {
          await api.delete(`/roles/users/${editUser.id}/roles/${id}`);
        }
      }

      toast.success('User updated');
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const canCreate = hasPermission('USER_MANAGEMENT.create');
  const canEdit   = hasPermission('USER_MANAGEMENT.edit');

  if (noAccess) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-12 text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-gray-700 font-medium">Access denied</p>
          <p className="text-sm text-gray-400 mt-1">Requires permission: USER_MANAGEMENT.view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5">

      {/* Header + Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">User Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Add, edit and assign roles to users</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition"
            >
              <RiUserAddLine size={16} />
              Add User
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <RiSearchLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <SimpleDropdown
            value={filterRole}
            onChange={setFilterRole}
            placeholder="All Roles"
            options={roles.map(r => ({ label: r.name, value: r.code }))}
          />
          <SimpleDropdown
            value={filterStatus === 'all' ? '' : filterStatus}
            onChange={v => setFilterStatus((v || 'all') as 'all' | 'active' | 'inactive')}
            placeholder="All Status"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
          {(search || filterRole || filterStatus !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus('all'); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filteredUsers.length} entries</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Roles</th>
              <th className="px-6 py-3 text-center text-gray-500 font-medium">Status</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Created</th>
              {canEdit && <th className="px-6 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No data</td></tr>
            ) : filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/60">
                <td className="px-6 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-6 py-3 text-gray-500">{u.email}</td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.userRoles.length === 0
                      ? <span className="text-gray-300 text-xs">No role</span>
                      : u.userRoles.map(ur => (
                          <span key={ur.role.id} className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-medium">
                            {ur.role.name}
                          </span>
                        ))}
                  </div>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
                  }`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-400 text-xs">
                  {new Date(u.createdAt).toLocaleDateString('th-TH')}
                </td>
                {canEdit && (
                  <td className="px-6 py-3">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                    >
                      <RiPencilLine size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Create User */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Add New User</h3>
            <p className="text-sm text-gray-400 -mt-2">User will sign in with Google using this email</p>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Full name"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Roles <span className="text-red-500">*</span></label>
              <RoleDropdown roles={roles} selectedIds={newRoleIds} onChange={toggleNewRole} />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setShowCreate(false); setNewEmail(''); setNewName(''); setNewRoleIds(new Set()); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={createUser}
                disabled={creating || !newEmail || !newName || newRoleIds.size === 0}
                className="px-5 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
              >
                {creating ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit User</h3>
              <span className="text-sm text-gray-400">{editUser.email}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Roles</label>
              <RoleDropdown roles={roles} selectedIds={editRoleIds} onChange={toggleEditRole} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <button
                type="button"
                onClick={() => setEditActive(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editActive ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  editActive ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={saveUser}
                disabled={saving}
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
