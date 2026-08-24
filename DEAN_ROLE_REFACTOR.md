# DEAN Role Refactor Plan

## Concept

**DEAN role = "สิทธิ์ sign ระดับคณบดี"** ไม่ใช่ตำแหน่งที่ตายตัว

ใครก็ตามที่ได้รับมอบหมายให้ sign แทนคณบดี ไม่ว่าจะเป็นคณบดี, รองคณบดี, หรือผู้รักษาการ — ก็แค่ assign DEAN role ให้คนนั้น ระบบไม่จำเป็นต้องรู้ว่าใครคือ "คณบดีจริง" กับ "รองคณบดี"

## Key Design Decisions

| เรื่อง | การตัดสินใจ |
|---|---|
| Dean มีนักศึกษาของตัวเองมั้ย | ❌ ไม่มี |
| Dean มี Advisor record มั้ย | ❌ ไม่มี — เป็น User ล้วนๆ |
| มีได้กี่คน | ✅ หลายคนได้ |
| ใครจัดการ | Staff assign DEAN role ผ่าน `/manage/users` |
| Request ที่ Dean เห็น | เฉพาะ status `FORWARDED_TO_DEAN` เท่านั้น |
| Dean sign document | เลือกจาก dropdown รายชื่อทุกคนที่มี DEAN role |

## What Changes

### Backend

- **Prisma schema** — ลบ `isDean Boolean` ออกจาก `Advisor` model
- **advisor.repository.ts** — ลบ `isDean` ออกจาก `CreateAdvisorDto`, `UpdateAdvisorDto`, `createWithUser`, `updateById`
- **advisor.controller.ts** — ลบ `isDean` ออกจากทุก handler รวมถึง `importAdvisors`
- **`GET /advisors/dean`** — เปลี่ยนเป็น `GET /deans` คืน users ทุกคนที่มี DEAN role
- **request.service.ts** — เปลี่ยนจากเช็ค `advisorFull?.isDean` → เช็ค `userRole === 'DEAN'`
- Dean เห็น request ทั้งหมดที่ `FORWARDED_TO_DEAN` (shared queue, first-come-first-served)

### Frontend

- **middleware.ts** — เพิ่ม `DEAN: ['/dean']`
- สร้าง **`/dean/` portal** (request list + request detail)
  - เห็นเฉพาะ `FORWARDED_TO_DEAN` requests
  - มีปุ่ม Approve / Reject
- **Document template** — เปลี่ยนจาก auto-fetch dean name → **dropdown เลือก Dean** (แสดงรายชื่อทุกคนที่มี DEAN role)
- ลบ `isDean` checkbox ออกจาก `AddAdvisorModal`, staff advisor edit page, import columns
- ลบ `isDean` ออกจาก `ApiAdvisor` type ใน `lib/api.ts`

### Role Management

- สร้าง DEAN role ใน `/manage/roles`
- assign ผ่าน `/manage/users` เหมือน role อื่นๆ
- ไม่มี UI พิเศษสำหรับ Dean นอกจากนี้

## Request Flow (ไม่เปลี่ยน)

```
Student submits
  → PENDING
  → FORWARDED_TO_ADVISOR
  → ADVISOR_APPROVED
  → [Staff reviews]
  → FORWARDED_TO_DEAN   ← Dean ทุกคนเห็น request นี้
  → DEAN_APPROVED / DEAN_REJECTED
```

## Document Signature Flow (เปลี่ยน)

**เดิม:** ดึงชื่อ Dean คนแรกที่ `isDean = true` มาใส่อัตโนมัติ

**ใหม่:** ตอนสร้าง document → ระบบแสดง dropdown รายชื่อทุกคนที่มี DEAN role → ผู้ใช้เลือกว่าจะให้ใครเป็นคน sign

## Out of Scope

- ไม่สร้าง VICE_DEAN role แยก (ใช้ DEAN role เดียวกัน)
- ไม่เปลี่ยน request approval flow (enum RequestStatus คงเดิม)
- ไม่เปลี่ยน Advisor portal
