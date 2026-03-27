'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RiShieldKeyholeLine, RiUserAddLine, RiRefreshLine, RiLockLine, RiPencilLine, RiCloseLine } from 'react-icons/ri';

const API = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

interface StaffUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

async function devFetch(path: string, devKey: string, options?: RequestInit) {
  const res = await fetch(`${API}/api/dev${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-dev-key': devKey, ...options?.headers },
  });
  return res.json();
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary transition';
const labelCls = 'text-xs font-semibold text-primary/70 mb-1 block';

export default function DevPage() {
  const router = useRouter();
  const [devKey, setDevKey]     = useState('');
  const [inputKey, setInputKey] = useState('');
  const [keyError, setKeyError] = useState('');

  const [staff, setStaff]                 = useState<StaffUser[]>([]);
  const [loading, setLoading]             = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg]       = useState('');
  const [formError, setFormError]         = useState('');
  const [form, setForm]                   = useState({ name: '', email: '', phone: '' });

  // Edit modal state
  const [editTarget, setEditTarget]   = useState<StaffUser | null>(null);
  const [editForm, setEditForm]       = useState({ name: '', phone: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState('');

  const loadStaff = useCallback(async (key: string) => {
    setLoading(true);
    const data = await devFetch('/staff', key);
    setLoading(false);
    if (data.success) {
      setStaff(data.data);
    } else {
      sessionStorage.removeItem('dev_key');
      setDevKey('');
      setKeyError('Invalid dev key');
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('dev_key');
    if (saved) { setDevKey(saved); loadStaff(saved); }
  }, [loadStaff]);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError('');
    const data = await devFetch('/staff', inputKey);
    if (data.success) {
      sessionStorage.setItem('dev_key', inputKey);
      setDevKey(inputKey);
      setStaff(data.data);
    } else {
      setKeyError('Invalid dev key');
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('dev_key');
    setDevKey('');
    router.push('/login');
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setSubmitLoading(true);
    const data = await devFetch('/staff', devKey, {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setSubmitLoading(false);
    if (data.success) {
      setStaff(prev => [data.data, ...prev]);
      setForm({ name: '', email: '', phone: '' });
      setSuccessMsg(`Created: ${data.data.email}`);
    } else {
      setFormError(data.message ?? 'Failed to create staff');
    }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    const data = await devFetch(`/staff/${id}`, devKey, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (data.success) setStaff(prev => prev.map(u => u.id === id ? data.data : u));
  };

  const openEdit = (u: StaffUser) => {
    setEditTarget(u);
    setEditForm({ name: u.name, phone: u.phone ?? '' });
    setEditError('');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError('');
    setEditLoading(true);
    const data = await devFetch(`/staff/${editTarget.id}`, devKey, {
      method: 'PUT',
      body: JSON.stringify({ name: editForm.name, phone: editForm.phone || null }),
    });
    setEditLoading(false);
    if (data.success) {
      setStaff(prev => prev.map(u => u.id === editTarget.id ? data.data : u));
      setEditTarget(null);
    } else {
      setEditError(data.message ?? 'Failed to update');
    }
  };

  // ── Lock screen ──────────────────────────────────────────────────
  if (!devKey) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#DEEBFF' }}>
        <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(120vw,80rem)', height: 'min(120vw,80rem)', top: 'max(-60vw,-40rem)', left: 'max(-60vw,-40rem)' }} />
        <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(95vw,64rem)',  height: 'min(95vw,64rem)',  top: 'max(-47.5vw,-32rem)', left: 'max(-47.5vw,-32rem)' }} />
        <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(70vw,48rem)',  height: 'min(70vw,48rem)',  top: 'max(-35vw,-24rem)',   left: 'max(-35vw,-24rem)' }} />
        <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(120vw,80rem)', height: 'min(120vw,80rem)', bottom: 'max(-60vw,-40rem)', right: 'max(-60vw,-40rem)' }} />
        <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(95vw,64rem)',  height: 'min(95vw,64rem)',  bottom: 'max(-47.5vw,-32rem)', right: 'max(-47.5vw,-32rem)' }} />
        <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(70vw,48rem)',  height: 'min(70vw,48rem)',  bottom: 'max(-35vw,-24rem)',   right: 'max(-35vw,-24rem)' }} />

        <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm mx-6 p-8 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <RiShieldKeyholeLine size={28} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Dev Console</h1>
            <p className="text-xs text-gray-400">College of Computing — Staff Management</p>
          </div>
          <form onSubmit={handleKeySubmit} className="flex flex-col gap-3">
            <div>
              <label className={labelCls}>Dev Key</label>
              <input type="password" placeholder="Enter dev key" value={inputKey}
                onChange={e => setInputKey(e.target.value)} className={inputCls} required />
              {keyError && <p className="text-red-500 text-xs mt-1">{keyError}</p>}
            </div>
            <button type="submit" className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition text-sm">Unlock</button>
            <button type="button" onClick={() => router.push('/login')} className="w-full text-sm text-gray-400 hover:text-primary transition">Back to Login</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main console ─────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-secondary flex flex-col">
      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary">Edit Staff</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600"><RiCloseLine size={20} /></button>
            </div>
            <p className="text-xs text-gray-400 -mt-2">{editTarget.email}</p>
            <form onSubmit={handleEditSave} className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone No.</label>
                <input type="tel" placeholder="e.g. 043-202-222" value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
              </div>
              {editError && <p className="text-red-500 text-xs">{editError}</p>}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 border border-gray-200 text-gray-500 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition text-sm disabled:opacity-50">
                  {editLoading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-primary px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="h-9 w-auto brightness-0 invert" />
          <div className="hidden md:block border-l border-white/30 pl-3">
            <p className="text-white font-semibold text-sm leading-none">Dev Console</p>
            <p className="text-white/60 text-xs mt-0.5">Staff Management</p>
          </div>
        </div>
        <button onClick={handleLock} className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition">
          <RiLockLine size={16} /> Lock & Exit
        </button>
      </div>

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── Add Staff Form ── */}
            <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <RiUserAddLine size={18} className="text-primary" />
                <h2 className="font-semibold text-primary">Add Staff Account</h2>
              </div>
              <p className="text-xs text-gray-400 -mt-2">Staff login via Google OAuth — no password required</p>
              <form onSubmit={handleCreateStaff} className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input type="text" placeholder="e.g. Somchai Jaidee" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" placeholder="e.g. somchai@kku.ac.th" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone No.</label>
                  <input type="tel" placeholder="e.g. 043-202-222" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
                </div>
                {formError  && <p className="text-red-500 text-xs">{formError}</p>}
                {successMsg && <p className="text-green-600 text-xs font-medium">{successMsg}</p>}
                <button type="submit" disabled={submitLoading}
                  className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition text-sm disabled:opacity-50 mt-1">
                  {submitLoading ? 'Creating…' : 'Create Staff'}
                </button>
              </form>
            </div>

            {/* ── Staff List ── */}
            <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-primary">Staff Accounts ({staff.length})</h2>
                <button onClick={() => loadStaff(devKey)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition">
                  <RiRefreshLine size={13} /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {[0, 1, 2].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
                </div>
              ) : staff.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No staff accounts yet.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                  {staff.map(u => (
                    <div key={u.id} className="border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-primary truncate">{u.name}</p>
                        <p className="text-gray-400 text-xs truncate">{u.email}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {u.phone || <span className="text-gray-300 italic">no phone</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => openEdit(u)}
                          className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-primary hover:text-primary transition"
                          title="Edit">
                          <RiPencilLine size={13} />
                        </button>
                        <button onClick={() => toggleActive(u.id, u.isActive)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                            u.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                              : 'bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700'
                          }`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-white text-sm font-medium tracking-widest" style={{ backgroundColor: '#0776BC' }}>
        College of Computing Khon Kaen University
      </footer>
    </div>
  );
}
