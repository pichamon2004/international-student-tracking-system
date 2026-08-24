# แผนการลบ Phase 1 ออกจากระบบลงทะเบียนนักศึกษา

## ภาพรวม

### ปัญหาปัจจุบัน
ระบบมีขั้นตอนลงทะเบียนสำหรับนักศึกษา 2 ขั้น:
- **Phase 1** — นักศึกษากรอกข้อมูลส่วนตัว (ชื่อ, ประเทศ, โปรแกรม, วันเกิด) ที่หน้า `/student/register`
- **Phase 2** — นักศึกษากรอก to-do checklist (passport, visa, ประกัน ฯลฯ) ที่หน้า `/student/profile`

### เหตุผลที่ต้องลบ Phase 1
Staff สามารถกรอกข้อมูลที่เคยต้องให้นักศึกษากรอกใน Phase 1 ได้แล้วตอนสร้างบัญชี (ผ่าน Add Student modal หรือ Excel import) → Phase 1 ซ้ำซ้อนและไม่จำเป็นอีกต่อไป

### ผลลัพธ์ที่ต้องการ
นักศึกษา login ครั้งแรก → เห็นหน้า to-do checklist (`/student/profile`) ทันที ไม่ต้องผ่านฟอร์ม Phase 1

---

## State Machine ใหม่

| `registrationStep` | `registrationStatus` | ความหมาย | นักศึกษาเห็น |
|----|----|----|-----|
| 1 | ACTIVE | Staff สร้างบัญชีแล้ว, นักศึกษายังไม่กรอก checklist | `/student/profile` (to-do list) |
| 2 | PENDING_APPROVAL | นักศึกษา submit checklist แล้ว, รอ staff กรอก academic info | `/student/pending` |
| 2 | ACTIVE | ลงทะเบียนครบสมบูรณ์ | `/student/dashboard` |
| any | REJECTED | ถูก reject | `/student/profile` |

### State Machine เดิม (เพื่ออ้างอิง)
| step | status | ความหมาย |
|------|--------|-----------|
| 0 | PENDING_APPROVAL | Staff สร้างบัญชี, นักศึกษายังไม่เริ่ม Phase 1 |
| 1 | PENDING_APPROVAL | Phase 1 submitted, รอ staff approve |
| 1 | ACTIVE | Phase 1 approved, นักศึกษาทำ Phase 2 ได้ |
| 2 | PENDING_APPROVAL | Phase 2 submitted, รอ staff |
| 2 | ACTIVE | ลงทะเบียนครบ |

---

## รายการไฟล์ที่ต้องแก้ไข

### Backend

#### 1. `backend/src/repositories/student.repository.ts`
**สิ่งที่แก้:** ฟังก์ชัน `createWithUser()` — เปลี่ยน initial state

```typescript
// ก่อน
registrationStatus: 'PENDING_APPROVAL',
registrationStep: 0,

// หลัง
registrationStatus: 'ACTIVE',
registrationStep: 1,
```

#### 2. `backend/src/services/domain/student.service.ts`
**สิ่งที่แก้:**
- **ลบ** `registerPhase1()` function ทั้งหมด (lines ~97–134)
- **แก้** `approveStudent()`: ลบ `isPhase1` branch — ตอนนี้ approval ทุกครั้งคือหลัง Phase 2 เสมอ → message/link คงที่
  ```typescript
  // ก่อน
  const isPhase1 = student.registrationStep === 1;
  title: isPhase1 ? 'Phase 1 Approved' : 'Registration Approved',
  message: isPhase1 ? 'Phase 1 approved... please complete Phase 2' : 'Welcome!',
  link: isPhase1 ? '/student/profile' : '/student/dashboard',

  // หลัง
  title: 'Registration Approved',
  message: 'Your student registration has been fully approved. Welcome!',
  link: '/student/dashboard',
  ```
- **แก้** `rejectStudent()`: เปลี่ยน notification link จาก `/student/register` → `/student/profile`
- `submitPhase2()` **ไม่ต้องแก้** — validation `step === 1 && status === 'ACTIVE'` ยังถูกต้องสำหรับ flow ใหม่

#### 3. `backend/src/controllers/student.controller.ts`
**สิ่งที่แก้:** ลบ `registerStudent` handler ทั้งหมด (lines ~76-95)

#### 4. `backend/src/routes/student.routes.ts`
**สิ่งที่แก้:** ลบ route
```typescript
// ลบบรรทัดนี้
router.post('/register', authenticate, requireRole('STUDENT'), asyncHandler(registerStudent));
```

---

### Frontend

#### 5. `frontend/src/app/student/layout.tsx`
**สิ่งที่แก้:** Redirect logic

```typescript
// ก่อน
const EXEMPT_PATHS = ['/student/register', '/student/pending'];
// ...
if (status === 'PENDING_APPROVAL' && step === 0) {
  router.replace('/student/register');          // Phase 1 form
} else if (status === 'PENDING_APPROVAL' && (step === 1 || step === 2)) {
  router.replace('/student/pending');           // Waiting screen
} else {
  setChecked(true);                             // Allow through
}

// หลัง
const EXEMPT_PATHS = ['/student/pending'];      // ลบ /student/register ออก
// ...
if (status === 'PENDING_APPROVAL') {
  router.replace('/student/pending');           // Waiting screen (after checklist submit)
} else if (status === 'ACTIVE' && step === 1 && !pathname.startsWith('/student/profile')) {
  router.replace('/student/profile');           // New student → to-do checklist
} else {
  setChecked(true);                             // Allow through
}
```

#### 6. `frontend/src/app/student/register/page.tsx`
**สิ่งที่แก้:** **ลบไฟล์ทั้งหมด** (Phase 1 form page ไม่มีประโยชน์แล้ว)

#### 7. `frontend/src/app/student/pending/page.tsx`
**สิ่งที่แก้:** Simplify — แสดงข้อความเดียว (ไม่ต้องแยก Phase 1 vs Phase 2)
- ลบ `step` state และ branching logic
- ลบ redirect `if (ACTIVE && step === 1) → /student/profile` (state นี้ไม่มีแล้ว)
- ข้อความใหม่: *"Your registration documents have been submitted. Staff will review and complete your academic information."*

#### 8. `frontend/src/app/student/profile/page.tsx`
**สิ่งที่แก้:** เปลี่ยน label เท่านั้น — logic ไม่แตะ
- ปุ่ม "Submit Phase 2" → **"Submit Registration"**
- toast `'Phase 2 submitted!'` → `'Registration submitted!'`

#### 9. `frontend/src/app/staff/students/page.tsx`
**สิ่งที่แก้:** `registrationLabel()` function

```typescript
// ก่อน
if (step === 0) return { label: 'Awaiting Phase 1', cls: 'bg-gray-100 text-gray-600' };
if (step === 1) return { label: 'Phase 1 Review',  cls: 'bg-yellow-100 text-yellow-700' };
if (step === 2) return { label: 'Phase 2 Review',  cls: 'bg-blue-100 text-blue-700' };

// หลัง
if (step === 1 && status === 'ACTIVE')           return { label: 'Pending Setup',  cls: 'bg-sky-50 text-sky-600' };
if (step === 2 && status === 'PENDING_APPROVAL') return { label: 'Pending Review', cls: 'bg-blue-100 text-blue-700' };
```

#### 10. `frontend/src/app/staff/students/[id]/page.tsx`
**สิ่งที่แก้:** ลบ Phase 1 sections
- ลบ mock data สำหรับ `step=0` ("Awaiting Phase 1") และ `step=1, PENDING` ("Phase 1 Review")
- ลบ "Awaiting Phase 1" notice block (บริเวณ line 786-790)
- ลบ Approve/Reject buttons สำหรับ `step=1, PENDING` (Phase 1 approval)
- แก้ badge label: ลบ "Phase 1 Review" / "Awaiting Phase 1" — เหลือแค่ "Pending Setup" / "Pending Review" / "Active"
- แก้ข้อความ *"No information yet — student has not completed Phase 1."* → *"No information yet."*

#### 11. `frontend/src/lib/api.ts`
**สิ่งที่แก้:** ลบ `registerPhase1` method จาก `studentApi`
```typescript
// ลบ
registerPhase1: (data: Partial<ApiStudent>) =>
  api.post<{ success: boolean; data: ApiStudent }>('/students/register', data),
```

---

## หมายเหตุ: ข้อมูลใน Database ที่มีอยู่แล้ว

นักศึกษาที่มี `step=0` ใน DB อยู่แล้ว จะไม่ถูก redirect ไป Phase 1 อีก (เพราะลบ case นั้นออก) แต่ layout.tsx จะไม่รู้จะทำอะไรกับ `step=0, ACTIVE` → ควร run SQL ก่อน deploy:

```sql
UPDATE students
SET registration_step = 1, registration_status = 'ACTIVE'
WHERE registration_step = 0;
```

---

## ลำดับการทำงาน (Implementation Order)

```
1. Backend: repository → createWithUser initial state
2. Backend: service → ลบ registerPhase1, แก้ approveStudent, rejectStudent
3. Backend: controller → ลบ registerStudent
4. Backend: routes → ลบ POST /register
5. Frontend: layout.tsx → แก้ redirect logic
6. Frontend: ลบ register/page.tsx
7. Frontend: pending/page.tsx → simplify
8. Frontend: profile/page.tsx → แก้ label
9. Frontend: staff/students/page.tsx → แก้ registrationLabel
10. Frontend: staff/students/[id]/page.tsx → ลบ Phase 1 UI
11. Frontend: api.ts → ลบ registerPhase1
12. DB: run SQL update สำหรับ existing students
```

---

## Verification Checklist

- [ ] Staff สร้างนักศึกษาใหม่ → DB: `step=1, status=ACTIVE`
- [ ] นักศึกษา login ครั้งแรก → redirect ไป `/student/profile` (to-do checklist) ทันที
- [ ] ไม่มี Phase 1 form ปรากฏ
- [ ] นักศึกษากรอก to-do ครบ → คลิก "Submit Registration" → ไป `/student/pending`
- [ ] หน้า Pending แสดงข้อความ Phase 2 เท่านั้น
- [ ] Staff เห็น label "Pending Review" → เปิดหน้า detail → กรอก academic info → activate
- [ ] นักศึกษาที่ activated → login → เห็น full dashboard
- [ ] `/student/register` → 404 (page ถูกลบแล้ว)
- [ ] Backend `POST /api/students/register` → 404 (route ถูกลบแล้ว)
