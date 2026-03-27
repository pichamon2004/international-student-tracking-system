'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiEditLine, RiAddLine } from 'react-icons/ri';
import AddAdvisorModal, { NewAdvisorData } from '@/components/AddAdvisorModal';
import { advisorApi, type ApiAdvisor } from '@/lib/api';
import toast from 'react-hot-toast';

const avatarColors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400'];

export default function StaffAdvisorsPage() {
  const router = useRouter();
  const [advisors, setAdvisors] = useState<(ApiAdvisor & { _count?: { students: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    advisorApi.getAll()
      .then(res => setAdvisors(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getInitials = (advisor: ApiAdvisor) => {
    const name = [advisor.titleEn, advisor.firstNameEn, advisor.lastNameEn].filter(Boolean).join(' ');
    return name.split(' ').filter(w => /^[A-Z]/i.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  };

  const handleAddAdvisor = async (data: NewAdvisorData) => {
    try {
      await advisorApi.create({
        email: data.email,
        titleEn: data.prefix || undefined,
        firstNameEn: data.firstName,
        lastNameEn: data.lastName,
        phone: data.tel || undefined,
        nationality: data.nationality || undefined,
      });
      toast.success('Advisor account created successfully.');
      setShowAddModal(false);
      advisorApi.getAll().then(res => setAdvisors(res.data.data)).catch(() => {});
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create advisor');
    }
  };

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-2xl font-semibold text-primary">Advisor Management</p>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-6 py-2 rounded-2xl flex items-center gap-2 hover:opacity-90 transition-all duration-200"
        >
          <RiAddLine className="text-lg" />
          Advisor
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl shadow-md h-48 bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : advisors.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No advisors found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {advisors.map(advisor => {
            const fullName = [advisor.titleEn, advisor.firstNameEn, advisor.lastNameEn].filter(Boolean).join(' ') || '—';
            const studentCount = (advisor as ApiAdvisor & { _count?: { students: number } })._count?.students ?? 0;
            return (
              <div key={advisor.id} className="bg-white rounded-2xl p-5 flex flex-col gap-4 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

                {/* Top Row: Avatar + Edit */}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {getInitials(advisor)}
                  </div>
                  <button
                    onClick={() => router.push(`/staff/advisors/${advisor.id}/edit`)}
                    className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200"
                  >
                    <RiEditLine size={15} />
                  </button>
                </div>

                {/* Name + Faculty */}
                <div>
                  <p className="font-semibold text-primary leading-snug">{fullName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{advisor.faculty ?? advisor.position ?? '—'}</p>
                  {advisor.email && <p className="text-xs text-gray-400">{advisor.email}</p>}
                </div>

                <hr />

                {/* Info */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Work Permit</span>
                    <span className={`font-semibold ${advisor.workPermitNumber ? 'text-green-600' : 'text-gray-400'}`}>
                      {advisor.workPermitNumber ? 'On file' : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-semibold ${advisor.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {advisor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <hr />

                {/* Students */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Students ({studentCount})</span>
                    <button
                      onClick={() => router.push(`/staff/advisors/${advisor.id}/edit`)}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex items-center">
                    {avatarColors.slice(0, Math.min(studentCount, 3)).map((color, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-semibold border-2 border-white`}
                        style={{ marginLeft: i > 0 ? '-8px' : '0' }}
                      >
                        S{i + 1}
                      </div>
                    ))}
                    {studentCount > 3 && (
                      <div
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white"
                        style={{ marginLeft: '-8px' }}
                      >
                        {studentCount - 3}+
                      </div>
                    )}
                    {studentCount === 0 && <span className="text-xs text-gray-400">No students assigned</span>}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddAdvisorModal onSave={handleAddAdvisor} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
