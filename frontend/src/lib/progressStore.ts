export interface UserProfileProgress {
  personalInfoCompleted: boolean;
  passportCompleted: boolean;
  visaCompleted: boolean;
  healthInsuranceCompleted: boolean;
  academicDocumentCompleted: boolean;
  dependentCompleted: boolean;
}

const KEY = 'userProfileProgress';

const defaultProgress: UserProfileProgress = {
  personalInfoCompleted: false,
  passportCompleted: false,
  visaCompleted: false,
  healthInsuranceCompleted: false,
  academicDocumentCompleted: false,
  dependentCompleted: false,
};

export { defaultProgress };

export function getProgress(): UserProfileProgress {
  if (typeof window === 'undefined') return defaultProgress;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultProgress, ...JSON.parse(raw) } : defaultProgress;
  } catch {
    return defaultProgress;
  }
}

export function setProgressField(field: keyof UserProfileProgress, value: boolean) {
  const current = getProgress();
  localStorage.setItem(KEY, JSON.stringify({ ...current, [field]: value }));
}
