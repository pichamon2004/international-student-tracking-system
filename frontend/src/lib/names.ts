type AdvisorName = {
  titleEn?: string | null;
  firstNameEn?: string | null;
  middleNameEn?: string | null;
  lastNameEn?: string | null;
};

/** "Dr. John Michael Smith" — title, first, middle and last name, skipping blanks */
export const advisorFullName = (a: AdvisorName) =>
  [a.titleEn, a.firstNameEn, a.middleNameEn, a.lastNameEn].filter(Boolean).join(' ');
