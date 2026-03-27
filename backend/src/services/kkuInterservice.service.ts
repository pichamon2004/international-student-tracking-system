/**
 * KKU Interservice Service — ตรวจสอบสถานะการยื่นต่อวีซ่า
 *
 * Production: ส่ง passportNumber → KKU Interservice API → รับสถานะกลับ
 * Prototype:  ใช้ mock แทนเพราะยังไม่มี endpoint จริงจาก KKU
 *
 * เมื่อได้ endpoint จริง: ตั้ง KKU_INTERSERVICE_URL + KKU_INTERSERVICE_API_KEY ใน .env
 */

export type KkuVisaRenewalStatus =
  | 'NOT_SUBMITTED'  // ยังไม่ได้เข้าไปกรอกข้อมูลในระบบ KKU เลย
  | 'PENDING'        // กรอกข้อมูลแล้ว รอการพิจารณา
  | 'APPROVED'       // ได้รับการอนุมัติแล้ว
  | 'REJECTED';      // ถูกปฏิเสธ

export interface KkuInterserviceResult {
  passportNumber: string;
  status: KkuVisaRenewalStatus;
  referenceId: string | null;  // เลขอ้างอิงจากระบบ KKU (null ถ้า NOT_SUBMITTED)
  message: string;
  checkedAt: string;           // ISO string
}

// ─── Mock responses ───────────────────────────────────────────────────────────
// จำลอง scenario ต่างๆ ตาม suffix ของ passport number
const getMockStatus = (passportNumber: string): KkuVisaRenewalStatus => {
  const upper = passportNumber.toUpperCase();
  if (upper.endsWith('0') || upper.endsWith('1')) return 'NOT_SUBMITTED';
  if (upper.endsWith('2') || upper.endsWith('3')) return 'PENDING';
  if (upper.endsWith('4') || upper.endsWith('5')) return 'APPROVED';
  if (upper.endsWith('6')) return 'REJECTED';
  return 'PENDING'; // default
};

const MOCK_MESSAGES: Record<KkuVisaRenewalStatus, string> = {
  NOT_SUBMITTED: 'นักศึกษายังไม่ได้กรอกข้อมูลขอต่อวีซ่าในระบบ KKU',
  PENDING:       'นักศึกษากรอกข้อมูลแล้ว อยู่ระหว่างรอการพิจารณา',
  APPROVED:      'การขอต่อวีซ่าได้รับการอนุมัติแล้ว',
  REJECTED:      'การขอต่อวีซ่าถูกปฏิเสธ กรุณาติดต่อเจ้าหน้าที่',
};

/**
 * ส่ง passportNumber ไปเช็คสถานะการยื่นต่อวีซ่ากับ KKU Interservice
 */
export const callKkuInterservice = async (
  passportNumber: string
): Promise<KkuInterserviceResult> => {
  const useMock = !process.env.KKU_INTERSERVICE_URL;

  if (useMock) {
    // จำลองความล่าช้าของ network
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const status = getMockStatus(passportNumber);
    const hasRef = status !== 'NOT_SUBMITTED';

    return {
      passportNumber,
      status,
      referenceId: hasRef ? `KKU-VISA-${passportNumber.slice(-4)}-${Date.now().toString(36).toUpperCase()}` : null,
      message: MOCK_MESSAGES[status],
      checkedAt: new Date().toISOString(),
    };
  }

  // ── Real KKU API ──────────────────────────────────────────────────────────
  const axios = await import('axios');
  const response = await axios.default.post(
    process.env.KKU_INTERSERVICE_URL!,
    { passportNumber },
    {
      headers: { 'x-api-key': process.env.KKU_INTERSERVICE_API_KEY },
      timeout: 10_000,
    }
  );
  return response.data as KkuInterserviceResult;
};
