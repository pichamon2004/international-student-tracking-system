'use client';

import { useRouter } from 'next/navigation';
import { RiEditLine, RiAddLine } from 'react-icons/ri';
import Button from '@/components/ui/Button';

interface Advisor {
  id: number;
  name: string;
  title: string;
  requestToDo: number;
  studentCount: number;
}

const mockAdvisors: Advisor[] = [
  { id: 1, name: 'Asst. Prof. Pusadee Seresangtakul', title: 'Associate Dean for Academic Affairs', requestToDo: 2, studentCount: 5 },
  { id: 2, name: 'Asst. Prof. Pusadee Seresangtakul', title: 'Associate Dean for Academic Affairs', requestToDo: 2, studentCount: 5 },
  { id: 3, name: 'Asst. Prof. Pusadee Seresangtakul', title: 'Associate Dean for Academic Affairs', requestToDo: 2, studentCount: 5 },
  { id: 4, name: 'Asst. Prof. Pusadee Seresangtakul', title: 'Associate Dean for Academic Affairs', requestToDo: 2, studentCount: 5 },
];

const avatarColors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400'];

export default function StaffAdvisorsPage() {
  const router = useRouter();

  const getInitials = (name: string) =>
    name.split(' ').filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-2xl font-semibold text-primary">Teachers Management</p>
        <Button variant="primary" label="+ Teacher" onClick={() => {}} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {mockAdvisors.map(advisor => (
          <div key={advisor.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">

            {/* Top Row: Avatar + Edit */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                {getInitials(advisor.name)}
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

    </div>
  );
}
