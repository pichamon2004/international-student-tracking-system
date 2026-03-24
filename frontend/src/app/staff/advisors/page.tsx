'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiEditLine, RiAddLine } from 'react-icons/ri';
import AddAdvisorModal, { NewAdvisorData } from '@/components/AddAdvisorModal';

interface Advisor {
  id: number;
  name: string;
  title: string;
  requestToDo: number;
  studentCount: number;
  photoUrl?: string;
}

const initialAdvisors: Advisor[] = [
  { id: 1, name: 'Asst. Prof. Pusadee Seresangtakul', title: 'Associate Dean for Academic Affairs', requestToDo: 2, studentCount: 5 },
  { id: 2, name: 'Asst. Prof. Pusadee Seresangtakul', title: 'Associate Dean for Academic Affairs', requestToDo: 2, studentCount: 5 },
  { id: 3, name: 'Asst. Prof. Pusadee Seresangtakul', title: 'Associate Dean for Academic Affairs', requestToDo: 2, studentCount: 5 },
  { id: 4, name: 'Asst. Prof. Pusadee Seresangtakul', title: 'Associate Dean for Academic Affairs', requestToDo: 2, studentCount: 5 },
];

const avatarColors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400'];

export default function StaffAdvisorsPage() {
  const router = useRouter();
  const [advisors, setAdvisors] = useState<Advisor[]>(initialAdvisors);
  const [showAddModal, setShowAddModal] = useState(false);

  const getInitials = (name: string) =>
    name.split(' ').filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const handleAddAdvisor = (data: NewAdvisorData) => {
    const fullName = [data.prefix, data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
    const newId = Math.max(0, ...advisors.map(a => a.id)) + 1;
    setAdvisors(prev => [...prev, { id: newId, name: fullName, title: data.nationality, requestToDo: 0, studentCount: 0, photoUrl: data.photoUrl }]);
    setShowAddModal(false);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {advisors.map(advisor => (
          <div key={advisor.id} className="bg-white rounded-2xl p-5 flex flex-col gap-4
           shadow-md hover:shadow-xl hover:-translate-y-1
           transition-all duration-300">

            {/* Top Row: Avatar + Edit */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                {advisor.photoUrl
                  ? <img src={advisor.photoUrl} alt={advisor.name} className="w-full h-full object-cover" />
                  : getInitials(advisor.name)}
              </div>
              <button
                onClick={() => router.push(`/staff/advisors/${advisor.id}/edit`)}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200"
              >
                <RiEditLine size={15} />
              </button>
            </div>

            {/* Name + Title */}
            <div>
              <p className="font-semibold text-primary leading-snug">{advisor.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{advisor.title}</p>
            </div>

            <hr />

            {/* Info + Request */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Information</span>
                <span className="font-semibold text-green-600">Done</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Request To Do</span>
                <span className="font-bold text-primary">{advisor.requestToDo}</span>
              </div>
            </div>

            <hr />

            {/* Students */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Students</span>
                <button
                  onClick={() => router.push(`/staff/advisors/${advisor.id}/edit`)}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Edit Students
                </button>
              </div>
              <div className="flex items-center gap-1">
                {avatarColors.map((color, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-semibold border-2 border-white -ml-${i > 0 ? '2' : '0'}`}
                    style={{ marginLeft: i > 0 ? '-8px' : '0' }}
                  >
                    S{i + 1}
                  </div>
                ))}
                {advisor.studentCount > 3 && (
                  <div
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white"
                    style={{ marginLeft: '-8px' }}
                  >
                    {advisor.studentCount - 3}+
                  </div>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>

      {showAddModal && (
        <AddAdvisorModal onSave={handleAddAdvisor} onClose={() => setShowAddModal(false)} />
      )}

    </div>
  );
}
