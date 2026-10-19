// The semester a student started in (students.startingSemester)
export const STARTING_SEMESTER_OPTIONS = [
  { value: 'FIRST',  label: 'First semester (ภาคต้น)' },
  { value: 'SECOND', label: 'Second semester (ภาคปลาย)' },
  { value: 'SUMMER', label: 'Summer session (ภาคพิเศษ)' },
];

export const semesterLabel = (value: string | null | undefined) =>
  STARTING_SEMESTER_OPTIONS.find(o => o.value === value)?.label ?? '—';
