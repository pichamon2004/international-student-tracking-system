// Shared mock data — in a real app these come from API calls

/* ─── Student profile ────────────────────────────────────── */
export interface StudentProfile {
  studentId: string;
  titleEn: string;       // Mr. / Ms. / Miss / Dr.
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  phone: string;
  faculty: string;
  program: string;
  level: 'BACHELOR' | 'MASTER' | 'PHD';
  scholarship: string;
  fundingType: string;
  advisorName: string;
  visaExpiry: string;    // dd/mm/yyyy
}

export const mockStudentProfile: StudentProfile = {
  studentId: '033380305-4',
  titleEn: 'Miss',
  firstNameEn: 'Pichamon',
  lastNameEn: 'Phongphrathapet',
  email: 'pichamon.p@kkumail.com',
  phone: '085-123-4567',
  faculty: 'College of Computing',
  program: 'Computer Engineering',
  level: 'PHD',
  scholarship: 'KKU International Scholarship',
  fundingType: 'Scholarship',
  advisorName: 'Assoc. Prof. Dr. Somchai Jaidee',
  visaExpiry: '31/05/2026',
};

/* ─── Doc Templates (mirrors staff settings) ─────────────── */
export interface DocTemplate {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  variables: string[];
  body: string;
}

export const docTemplates: DocTemplate[] = [
  {
    id: 1,
    name: 'Leave Request Form',
    description: 'แบบฟอร์มขอออกนอกประเทศ (CP KKU)',
    isActive: true,
    variables: [
      '{{student_name}}', '{{student_id}}', '{{student_title}}',
      '{{thai_tel}}', '{{email}}', '{{education_level}}',
      '{{funding_type}}', '{{scholarship_name}}', '{{program}}',
      '{{destination}}', '{{purpose}}', '{{duration_days}}',
      '{{leave_start}}', '{{leave_end}}', '{{visa_expiry}}',
      '{{advisor_name}}', '{{date}}',
    ],
    body: `Memorandum

Subject: Leave Request / ขออนุญาตออกนอกประเทศชั่วคราว

To: Dean of the College of Computing, Khon Kaen University

Dear Dean,

I, {{student_title}} {{student_name}} (Student ID: {{student_id}}), Thai Tel. {{thai_tel}}, E-mail: {{email}},
am a {{education_level}} student funded by {{funding_type}} ({{scholarship_name}}) in the {{program}} program at the College of Computing, Khon Kaen University.

I would like to request permission to temporarily leave Thailand to travel to {{destination}} for the following purpose:
  {{purpose}}

Duration of leave: {{duration_days}}
Departure date: {{leave_start}}
Return date: {{leave_end}}

My current Thai visa expires on {{visa_expiry}}. I have already applied for a re-entry permit prior to departure.

I sincerely request your kind consideration and approval.

Yours faithfully,

Signature: ___________________________
Name: {{student_name}}
Date: {{date}}

Approved by Advisor: {{advisor_name}}
Advisor Signature: ___________________________`,
  },
  {
    id: 2,
    name: 'Enrollment Certificate',
    description: 'หนังสือรับรองการเป็นนักศึกษา',
    isActive: true,
    variables: ['{{student_name}}', '{{student_id}}', '{{program}}', '{{date}}'],
    body: `ENROLLMENT CERTIFICATE

College of Computing, Khon Kaen University

This is to certify that:

  Name: {{student_name}}
  Student ID: {{student_id}}

is currently enrolled in the {{program}} program at the College of Computing, Khon Kaen University and is a full-time student in good academic standing.

This certificate is issued upon request for official purposes.

Issued on: {{date}}

_____________________________
Dean of College of Computing`,
  },
  {
    id: 3,
    name: 'Travel Letter',
    description: 'หนังสือรับรองการเดินทาง',
    isActive: false,
    variables: ['{{student_name}}', '{{destination}}', '{{date}}'],
    body: `TRAVEL AUTHORIZATION LETTER

This letter is to confirm that {{student_name}} has been granted permission to travel to {{destination}} for academic purposes.

Issued on: {{date}}

_____________________________
Dean of College of Computing`,
  },
  {
    id: 4,
    name: 'Conference Participation Letter',
    description: 'หนังสือรับรองเข้าร่วมประชุมวิชาการ',
    isActive: true,
    variables: [
      '{{student_name}}', '{{student_id}}', '{{program}}', '{{advisor_name}}',
      '{{conference_name}}', '{{conference_venue}}', '{{paper_title}}', '{{date}}',
    ],
    body: `LETTER OF CONFIRMATION FOR CONFERENCE PARTICIPATION

College of Computing, Khon Kaen University

This is to confirm that {{student_name}} (Student ID: {{student_id}}), enrolled in the {{program}} program under the supervision of {{advisor_name}}, has been accepted to present at:

  Conference: {{conference_name}}
  Venue: {{conference_venue}}
  Paper Title: {{paper_title}}

This letter is issued to support visa and travel arrangements.

Issued on: {{date}}

_____________________________
Dean of College of Computing`,
  },
];

/* ─── Request Types (mirrors staff settings) ─────────────── */
export interface RequestTypeConfig {
  id: number;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
  requiredDocumentIds: number[];
}

export const requestTypeConfigs: RequestTypeConfig[] = [
  { id: 1, name: 'Leave Request Form',     icon: 'RiPlaneLine',        description: 'ขออนุญาตออกนอกประเทศชั่วคราว',   isActive: true,  requiredDocumentIds: [1] },
  { id: 2, name: 'Visa Extension',         icon: 'RiPassportLine',     description: 'ยื่นคำร้องขอต่ออายุวีซ่านักศึกษา', isActive: true,  requiredDocumentIds: [2] },
  { id: 3, name: 'Enrollment Certificate', icon: 'RiGraduationCapLine', description: 'หนังสือรับรองการเป็นนักศึกษา',    isActive: true,  requiredDocumentIds: [2] },
  { id: 4, name: 'Name Change',            icon: 'RiFileUserLine',     description: 'ขอเปลี่ยนชื่อ-นามสกุลในระบบ',         isActive: true,  requiredDocumentIds: [] },
  { id: 5, name: 'Conference Letter',      icon: 'RiGlobalLine',       description: 'ขอหนังสือรับรองเข้าร่วมประชุมวิชาการ', isActive: true,  requiredDocumentIds: [4] },
];
