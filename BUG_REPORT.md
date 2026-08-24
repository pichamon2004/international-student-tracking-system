# Bug Report — International Student Tracking System

**วันที่ตรวจสอบ:** 2026-07-11  
**Branch:** main  

---

## CRITICAL — ช่องโหว่ร้ายแรง

### BUG-1: Student เห็น Request ของนักศึกษาคนอื่นได้ทั้งหมด

**ไฟล์:** `backend/src/controllers/request.controller.ts` บรรทัด 11–59  
**ปัญหา:** ฟังก์ชัน `getRequests` ไม่มีการ filter สำหรับ STUDENT role เลย มีแค่ ADVISOR filter เท่านั้น เมื่อ Student เรียก `GET /api/requests` จะได้รับ request ทุกตัวในระบบโดยไม่กรองว่าเป็นของตัวเองเท่านั้น ในขณะที่ `getRequestById` (บรรทัด 84–93) มี STUDENT check แต่ `getRequests` ไม่มี

**แก้ไข:** เพิ่ม block สำหรับ STUDENT role ใน `getRequests`

```ts
if (req.user?.role === 'STUDENT') {
  const student = await prisma.student.findUnique({
    where: { userId: req.user.userId },
    select: { id: true },
  });
  studentWhereClause = { studentId: student?.id ?? -1 };
}
```

---

### BUG-2: Advisor เข้าถึง Request ของ Student ที่ไม่ใช่ลูกศิษย์ตัวเองได้

**ไฟล์:** `backend/src/controllers/request.controller.ts` บรรทัด 63–100  
**ปัญหา:** `getRequestById` ตรวจสอบเฉพาะ STUDENT role (บรรทัด 84–93) แต่ไม่ตรวจสอบ ADVISOR ทำให้ advisor สามารถเรียกดู request ของนักศึกษาที่ไม่ได้อยู่ในความดูแลของตนได้ ซึ่งขัดกับ business logic ใน `getRequests`

**แก้ไข:** เพิ่มการตรวจสอบว่า `request.advisorId` ตรงกับ advisor ที่ login อยู่ก่อน return ข้อมูล

---

### BUG-3: เก็บ `userId` แทน `advisorId` ใน field `Request.advisorId`

**ไฟล์:** `backend/src/controllers/request.controller.ts` บรรทัด 187  
**ปัญหา:** `Request.advisorId` ควรเป็น `Advisor.id` (primary key ของ Advisor table) แต่ที่นี่เก็บ `req.user?.userId` ซึ่งคือ `User.id` แทน นำไปสู่ค่าที่ผิดพลาดในฐานข้อมูล เพราะ Advisor.id และ User.id ใน auto-increment มักไม่ตรงกัน

```ts
// ❌ ผิด
advisorId: req.user?.userId

// ✅ ถูก
const advisor = await prisma.advisor.findUnique({
  where: { userId: req.user?.userId },
  select: { id: true },
});
advisorId: advisor?.id
```

---

### BUG-4: `GET /api/advisors/me` อนุญาต STAFF แต่จะ 404 เสมอ

**ไฟล์:** `backend/src/routes/advisor.routes.ts` บรรทัด 88  
**ปัญหา:** route นี้ระบุ `requireRole('ADVISOR', 'STAFF')` แต่ STAFF user ไม่มีแถวใน `advisors` table ทุก request จาก STAFF ไปยัง `/api/advisors/me` จะได้ 404 เสมอ ส่งผลให้หน้า advisor ใน frontend error เมื่อ STAFF พยายามเข้าถึง

```ts
// ❌ ผิด
router.get('/me', authenticate, requireRole('ADVISOR', 'STAFF'), ...)

// ✅ ถอด 'STAFF' ออก หรือเพิ่ม logic แยกสำหรับ STAFF
router.get('/me', authenticate, requireRole('ADVISOR'), ...)
```

---

## MEDIUM — Functionality ทำงานผิดพลาด

### BUG-5: `staffComment` แสดงข้อมูลผิด

**ไฟล์:** `frontend/src/app/student/request/[id]/page.tsx` บรรทัด 199  
**ปัญหา:** `staffComment` ถูก map จาก `r.description` (ข้อความที่ student เขียนตอนส่งคำร้อง) แทนที่จะเป็น `r.staffComment` ทำให้ความคิดเห็นของ staff ไม่เคยแสดงให้ student เห็น และแสดง description ของ student ในฐานะ staff comment แทน

```ts
// ❌ ผิด
staffComment: r.description ?? null,

// ✅ ถูก
staffComment: r.staffComment ?? null,
```

---

### BUG-6: Edit Advisor Form ไม่บันทึก `nationality` และ `middleName`

**ไฟล์:** `frontend/src/app/staff/advisors/[id]/edit/page.tsx` บรรทัด 92–109  
**ปัญหา:** form มี input field สำหรับ `nationality` และ `middleName` และโหลดค่ามาแสดงได้ถูกต้อง แต่เมื่อกด Save ทั้งสอง field ไม่ถูกส่งไปใน API call ทำให้การเปลี่ยนแปลงหายหมด

```ts
// ❌ ผิด — nationality และ middleName หายไป
await advisorApi.updateById(advisorId, {
  titleEn: prefix || undefined,
  firstNameEn: firstName || undefined,
  lastNameEn: lastName || undefined,
  phone: tel || undefined,
  isDean,
});

// ✅ ถูก
await advisorApi.updateById(advisorId, {
  titleEn: prefix || undefined,
  firstNameEn: firstName || undefined,
  middleNameEn: middleName || undefined,
  lastNameEn: lastName || undefined,
  phone: tel || undefined,
  nationality: nationality || undefined,
  isDean,
});
```

---

### BUG-7: `PUT /api/advisors/:id` รับ `req.body` โดยตรง — Mass Assignment

**ไฟล์:** `backend/src/routes/advisor.routes.ts` บรรทัด 172–182  
**ปัญหา:** ไม่มีการกรอง field จาก request body ทำให้ STAFF สามารถส่ง field ใดๆ ก็ได้เช่น `isActive: false`, `isDean: true`, `userId: X` หรือ field อื่นๆ ที่ไม่ควรแก้ไขได้โดยตรง

```ts
// ❌ ผิด
data: req.body,

// ✅ ถูก — whitelist fields ที่อนุญาต
const { titleEn, firstNameEn, middleNameEn, lastNameEn, phone, nationality, isDean } = req.body;
data: { titleEn, firstNameEn, middleNameEn, lastNameEn, phone, nationality, isDean },
```

---

### BUG-8: Photo ที่อัปโหลดใน AddAdvisorModal ไม่ถูก Save

**ไฟล์:** `frontend/src/components/AddAdvisorModal.tsx` บรรทัด 60 และ `frontend/src/app/staff/advisors/page.tsx` บรรทัด 32–41  
**ปัญหา:** `AddAdvisorModal` เก็บ photo เป็น base64 ใน `photoUrl` และส่งผ่าน `onSave` callback แต่ `handleAddAdvisor` ใน staff/advisors/page.tsx ไม่นำ `data.photoUrl` ไปใช้ในการ create advisor และ backend `POST /advisors` ก็ไม่รองรับ photo upload — photo หายเงียบทุกครั้ง

---

### BUG-9: Request ที่ CANCELLED แสดงใน Filter "Pending" ของ Advisor Page

**ไฟล์:** `frontend/src/app/advisor/request/page.tsx` บรรทัด 27–32  
**ปัญหา:** ฟังก์ชัน `displayFilter` ใช้ fallback `return 'Pending'` ซึ่งครอบคลุม status `CANCELLED` ด้วย เพราะ `statusConfig['CANCELLED'].label` = `'Cancelled'` ซึ่งไม่ตรงเงื่อนไข `['Approved', 'Rejected'].includes(label)`

```ts
// ❌ ผิด — CANCELLED ตกมาที่ return 'Pending'
function displayFilter(status: string): FilterType {
  if (status === 'FORWARDED_TO_DEAN') return 'Pending';
  const label = statusConfig[status]?.label ?? 'Pending';
  if (['Approved', 'Rejected'].includes(label)) return label as FilterType;
  return 'Pending';
}

// ✅ ถูก
function displayFilter(status: string): FilterType {
  if (status === 'FORWARDED_TO_DEAN') return 'Pending';
  const label = statusConfig[status]?.label ?? 'Pending';
  if (['Approved', 'Rejected', 'Cancelled'].includes(label)) return label as FilterType;
  return 'Pending';
}
```

---

### BUG-10: Activity Log ใน Staff Request Detail Hardcode "pending" ตลอดเวลา

**ไฟล์:** `frontend/src/app/staff/request/[id]/page.tsx` บรรทัด 233–237  
**ปัญหา:** row ที่สองของ Activity Log hardcode สี yellow และข้อความ "pending" เสมอ แม้ว่า request จะถูก approve หรือ complete แล้วก็ตาม ควรแสดงสถานะจริงตาม `req.status`

```tsx
{/* ❌ ผิด — hardcode */}
<span className="... bg-yellow-50 text-yellow-600">
  <span className="... bg-yellow-400 ... animate-pulse" /> pending
</span>
```

---

### BUG-11: Dean Case ใน Activity History ของ Advisor แสดง "Finished" ผิด

**ไฟล์:** `frontend/src/app/advisor/request/[id]/page.tsx` บรรทัด 143, 227–229  
**ปัญหา:** `isPending` ถูก define เป็น `req.status === 'FORWARDED_TO_ADVISOR'` เท่านั้น เมื่อ Dean เปิด request ที่มีสถานะ `FORWARDED_TO_DEAN` — `isPending` จะเป็น `false` ทำให้ activity history แสดง "Finished" (สีเขียว) แม้ว่า request ยังรอ Dean พิจารณาอยู่

```ts
// ❌ ผิด
const isPending = req.status === 'FORWARDED_TO_ADVISOR';

// ✅ ถูก
const isPending = req.status === 'FORWARDED_TO_ADVISOR' || req.status === 'FORWARDED_TO_DEAN';
```

---

## MINOR — ปัญหาเล็กน้อย

### BUG-12: `position` Field ใน `ApiAdvisor` ไม่มีใน Prisma Schema

**ไฟล์:** `frontend/src/lib/api.ts` บรรทัด 416, 525  
**ปัญหา:** `ApiAdvisor` interface มี field `position: string | null` แต่ Advisor model ใน `schema.prisma` ไม่มี field นี้เลย จะเป็น `undefined` เสมอเมื่อได้จาก API และถ้าส่ง `position` ไปใน `updateById` จะเกิด Prisma error ขณะ runtime

**แก้ไข:** ลบ `position` ออกจาก `ApiAdvisor` interface และ `updateById` parameter

---

### BUG-13: Dropdown ClickOutside Logic ผิด — สอง Dropdown เปิดพร้อมกันได้

**ไฟล์:** `frontend/src/app/staff/advisors/[id]/edit/page.tsx` บรรทัด 79–85  
**ปัญหา:** condition ใช้ `&&` ทำให้ต้องคลิกนอก dropdown ทั้งสองพร้อมกันจึงจะปิด ถ้าเปิด prefix dropdown แล้วคลิกที่ปุ่ม nationality trigger เงื่อนไขทั้งหมดจะเป็น false ทำให้ prefix dropdown ไม่ถูกปิด และสอง dropdown สามารถเปิดพร้อมกันได้

```ts
// ❌ ผิด
if (
  prefixRef.current && !prefixRef.current.contains(e.target as Node) &&
  nationalityRef.current && !nationalityRef.current.contains(e.target as Node)
) {
  setOpenPrefix(false);
  setOpenNationality(false);
}

// ✅ ถูก — แยก condition
if (prefixRef.current && !prefixRef.current.contains(e.target as Node)) {
  setOpenPrefix(false);
}
if (nationalityRef.current && !nationalityRef.current.contains(e.target as Node)) {
  setOpenNationality(false);
}
```

---

## สรุปตาราง

| # | Severity | ไฟล์ | บรรทัด | ปัญหา |
|---|----------|------|---------|-------|
| 1 | **CRITICAL** | `backend/.../request.controller.ts` | 11–59 | Student เห็น request ทุกตัวในระบบ |
| 2 | **CRITICAL** | `backend/.../request.controller.ts` | 63–100 | Advisor เข้าถึง request ของ student คนอื่นได้ |
| 3 | **CRITICAL** | `backend/.../request.controller.ts` | 187 | เก็บ `userId` แทน `advisorId` ใน Request.advisorId |
| 4 | **CRITICAL** | `backend/src/routes/advisor.routes.ts` | 88 | `GET /advisors/me` อนุญาต STAFF แต่จะ 404 เสมอ |
| 5 | **MEDIUM** | `frontend/.../student/request/[id]/page.tsx` | 199 | `staffComment` map จาก `r.description` ผิด |
| 6 | **MEDIUM** | `frontend/.../staff/advisors/[id]/edit/page.tsx` | 92–109 | `nationality` และ `middleName` ไม่ถูกบันทึก |
| 7 | **MEDIUM** | `backend/src/routes/advisor.routes.ts` | 172–182 | `PUT /:id` รับ `req.body` โดยตรง — mass assignment |
| 8 | **MEDIUM** | `AddAdvisorModal.tsx` + `staff/advisors/page.tsx` | 60, 32–41 | Photo ที่เลือกใน modal ไม่ถูก save |
| 9 | **MEDIUM** | `frontend/.../advisor/request/page.tsx` | 27–32 | CANCELLED แสดงใน filter "Pending" |
| 10 | **MEDIUM** | `frontend/.../staff/request/[id]/page.tsx` | 233–237 | Activity log hardcode "pending" ตลอดเวลา |
| 11 | **MEDIUM** | `frontend/.../advisor/request/[id]/page.tsx` | 143, 227 | Dean case แสดง "Finished" ผิด |
| 12 | **MINOR** | `frontend/src/lib/api.ts` | 416, 525 | `position` field ไม่มีใน Prisma schema |
| 13 | **MINOR** | `frontend/.../staff/advisors/[id]/edit/page.tsx` | 79–85 | Dropdown logic ผิด — สอง dropdown เปิดพร้อมกันได้ |
