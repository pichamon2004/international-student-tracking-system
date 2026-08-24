# International Student Tracking System — Programming Agreements

Tech Stack: Next.js 14 (App Router) + TypeScript | Express.js + TypeScript | Prisma | PostgreSQL

---

## Tech Stack

| Layer | Technology | หมายเหตุ |
|---|---|---|
| Frontend | Next.js 14 App Router + TypeScript | File-system routing, Server/Client components |
| Backend | Express.js + TypeScript | REST API |
| ORM | Prisma | ใช้ผ่าน `src/utils/prisma.ts` singleton เท่านั้น |
| Auth | JWT (jsonwebtoken) | Bearer token, decode ด้วย `authenticate` middleware |
| Validation | express-validator | ผ่าน `validate()` helper ใน `middleware/validate.middleware.ts` |
| File Storage | Cloudflare R2 | ผ่าน `services/r2.service.ts` เท่านั้น |
| Email | Nodemailer | ผ่าน `services/email.service.ts` เท่านั้น |
| Runtime | Docker (docker-compose.yml) | source of truth สำหรับ environment |

---

## Back-End

### 1. โครงสร้าง Route → Controller → Domain Service

```
Request → Route → Controller → Domain Service ─┬─ Repository → Prisma → DB
Response ←──────────────────────────────────────┘
                                                └─ External Service (Email / R2 / Notification)
```

```
Route
  ↓
Controller
  ↓
Domain Service
  ├── Repository
  │      ↓
  │    Prisma
  │      ↓
  │      DB
  │
  └── External Service
         ├── Email
         ├── R2
         └── Notification
```

| Layer | Path | หน้าที่ | กฎสำคัญ |
|---|---|---|---|
| Route | `src/routes/` | mount middleware, map URL → controller | ใส่ `authenticate`, `requireRole`, `validate()` ที่นี่เท่านั้น |
| Controller | `src/controllers/` | รับ req, เรียก domain service, ส่ง res | ห้าม try/catch, ห้าม Prisma, ห้าม business logic |
| Domain Service | `src/services/domain/` | business logic, orchestrate repository + external service | ห้าม Prisma โดยตรง — ใช้ผ่าน repository เท่านั้น |
| Repository | `src/repositories/` | Prisma queries เท่านั้น — Data Access Layer | ห้ามมี business logic, ห้าม call service อื่น |
| External Service | `src/services/external/` | email, R2, notification | ห้ามมี Prisma query |

#### Controller — กฎ

- ทุก controller function ต้องถูก wrap ด้วย `asyncHandler` ใน route file — **ห้ามใช้ `try/catch` inline ใน controller**
- controller มีหน้าที่เดียว: รับ `req` → เรียก service → ส่ง `res`
- ห้าม Prisma query ใน controller โดยตรง — ผ่าน service เสมอ
- ห้าม business logic ใน controller — ย้ายไปที่ service
- ส่ง response ผ่าน `res.json({ success: true, data: ... })` หรือ `res.status(4xx).json({ success: false, message: ... })` เท่านั้น
- **ห้าม** `console.error` และ `res.status(500)` ใน controller — error handler จัดการให้

```ts
// ✅ ถูก — controller บาง ทำหน้าที่รับ/ส่ง HTTP เท่านั้น
export const getRequestById = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await requestService.getById(parseInt(req.params.id));
  if (!request) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: request });
};

// ❌ ผิด — มี Prisma และ logic ใน controller
export const getRequestById = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await prisma.request.findUnique({ where: { id: +req.params.id } });
  if (!request) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: request });
};
```

#### Service — กฎ

- Service มีหน้าที่ business logic และ orchestrate การเรียก repository
- ห้าม Prisma โดยตรง — ต้องเรียกผ่าน repository เสมอ
- External service call ที่ล้มเหลวต้องไม่ทำให้ main operation fail — ใช้ `.catch(console.error)` รอบ fire-and-forget

```ts
// ✅ ถูก — service มี logic, เรียก repository
export const approveStudent = async (studentId: number): Promise<Student> => {
  const student = await studentRepository.findById(studentId);
  if (!student) throw new Error('Student not found');

  const updated = await studentRepository.updateStatus(studentId, 'ACTIVE');
  createNotification({ userId: student.userId, ... }).catch(console.error);
  return updated;
};
```

#### Repository — กฎ

- Repository มีหน้าที่ Prisma query เท่านั้น — ไม่มี business logic
- Whitelist fields ใน update เสมอ — ห้ามส่ง object ดิบจาก service เข้า Prisma โดยไม่กรอง
- `include` ได้เพียง 1 ชั้น — ถ้าต้องการ nested ลึกกว่านี้ให้ใช้ `select` หรือแยก query
- ใช้ `import prisma from '../utils/prisma'` เท่านั้น — ห้าม `new PrismaClient()`

```ts
// ✅ ถูก — repository แค่ query
export const findById = (id: number) =>
  prisma.request.findUnique({
    where: { id },
    include: { student: { select: { id: true, firstNameEn: true } } },
  });

// ✅ ถูก — whitelist fields
export const update = (id: number, data: UpdateStudentDto) =>
  prisma.student.update({
    where: { id },
    data: { firstNameEn: data.firstNameEn, lastNameEn: data.lastNameEn, ... },
  });
```

#### Route — กฎ

- ลำดับ middleware ต้องเป็น: `authenticate` → `requireRole(...)` → `validate(schema)` → `asyncHandler(controller)`
- ห้ามวาง business logic ใน route file
- ถ้า endpoint ต้องการ ownership check ให้ใช้ middleware จาก `ownership.middleware.ts` ก่อน controller

```ts
// ✅ ถูก — ลำดับ middleware ถูกต้อง
router.put('/:id/status',
  authenticate,
  requireRole('STAFF', 'ADVISOR'),
  updateRequestStatusSchema,
  asyncHandler(updateRequestStatus)
);
```

---

### 2. Authentication & Authorization

#### `authenticate`
กำหนดไว้ใน `middleware/auth.middleware.ts` — ใส่กับทุก protected route
- ดึง token จาก `Authorization: Bearer <token>` header
- decode JWT และ set `req.user` (`userId`, `email`, `role`)
- return 401 หากไม่มี token หรือ token หมดอายุ

#### `requireRole(...roles)`
- ใส่ถัดจาก `authenticate` เสมอ
- รับหลาย role ได้: `requireRole('STAFF', 'ADVISOR')`
- return 403 หาก role ไม่ตรง

#### Ownership Middleware (`middleware/ownership.middleware.ts`)
ใช้สำหรับ check เจ้าของข้อมูลระดับ record:

| Middleware | ใช้เมื่อ |
|---|---|
| `requireStudentOwnership` | STAFF/ADVISOR ผ่าน, STUDENT ผ่านเฉพาะ record ตัวเอง |
| `requireStudentSelf` | เฉพาะ STUDENT เจ้าของเท่านั้น (STAFF/ADVISOR ห้าม write) |
| `requireAdvisorOwnership` | STAFF ผ่าน, ADVISOR ผ่านเฉพาะ student ในความดูแล |

**กฎ:** ทุก endpoint ที่ STUDENT หรือ ADVISOR เรียกได้ต้องมี ownership check เสมอ — ห้าม filter ใน controller โดยไม่มี middleware คุ้มกัน

---

### 3. Validation

- ทุก POST/PUT endpoint ต้องผ่าน `validate()` schema ก่อน controller
- กำหนด schema ใน `middleware/validate.middleware.ts` พร้อมชื่อ export ที่สื่อความหมาย เช่น `createStudentSchema`
- ห้าม validate ด้วย `if (!body.field)` ใน controller ถ้า field นั้น required — ให้ใส่ใน schema แทน
- exception: STUDENT-specific logic (เช่น override `studentId` ด้วย session) อนุญาตให้ทำใน controller ได้

```ts
// ✅ ถูก — validation อยู่ใน schema
export const createRequestSchema = validate([
  body('title').notEmpty().withMessage('title is required'),
  body('requestTypeId').optional().isInt(),
]);

// ❌ ผิด — validation ใน controller
if (!req.body.title) {
  res.status(400).json({ success: false, message: 'title is required' });
  return;
}
```

---

### 5. External Services

- **Email** → ใช้ผ่าน `services/external/email.service.ts` — ห้าม import Resend/nodemailer โดยตรงใน service หรือ controller
- **File Upload** → ใช้ผ่าน `services/external/r2.service.ts` — ห้าม write ไฟล์ไปที่ local disk
- **Notification** → ใช้ผ่าน `services/external/notification.service.ts` — ไม่ต้อง await ถ้าไม่จำเป็นต้องรอผล
- External service call ที่ล้มเหลวต้องไม่ทำให้ main operation fail — ใช้ `.catch(console.error)` เสมอ

```ts
// ✅ ถูก — เรียกจาก domain service, fire-and-forget
const updated = await studentRepository.updateStatus(id, 'ACTIVE');
createNotification({ ... }).catch(console.error);
return updated;
```

---

### 6. Response Format

ทุก endpoint ต้อง return JSON ในรูปแบบ `ApiResponse` เสมอ:

```ts
// Success
res.json({ success: true, data: result });
res.status(201).json({ success: true, data: created });

// Error
res.status(400).json({ success: false, message: 'เหตุผล' });
res.status(403).json({ success: false, message: 'Access denied' });
res.status(404).json({ success: false, message: 'Not found' });

// Paginated list
res.json({
  success: true,
  data: items,
  pagination: { page, limit, total, totalPages },
});
```

---

### 7. Key Files Reference (Backend)

| ไฟล์/Folder | หน้าที่ |
|---|---|
| `src/index.ts` | Express app factory, route mounting, global middleware |
| `src/utils/prisma.ts` | Prisma singleton — import จากนี้เสมอ, ใช้ใน repository เท่านั้น |
| `src/types/index.ts` | `AuthRequest`, `AuthPayload`, `ApiResponse`, `PaginationQuery` |
| `src/middleware/auth.middleware.ts` | `authenticate`, `requireRole` |
| `src/middleware/errorHandler.middleware.ts` | `asyncHandler`, global `errorHandler` |
| `src/middleware/ownership.middleware.ts` | `requireStudentOwnership`, `requireStudentSelf`, `requireAdvisorOwnership` |
| `src/middleware/validate.middleware.ts` | `validate()` helper + reusable schemas |
| `src/repositories/` | Prisma queries ทั้งหมด — 1 ไฟล์ต่อ 1 Prisma model |
| `src/services/domain/` | Business logic — 1 ไฟล์ต่อ 1 domain |
| `src/services/external/` | email, R2, notification — external integrations เท่านั้น |

---

## Front-End

### 1. โครงสร้าง Folder

```
src/
├── app/                    # Next.js App Router — routing ทั้งหมดอยู่ที่นี่
│   ├── student/            # หน้าของ STUDENT
│   ├── advisor/            # หน้าของ ADVISOR
│   └── staff/              # หน้าของ STAFF
├── components/             # Shared components (modal, layout)
│   └── ui/                 # Primitive UI components (Button, StatusBadge, ฯลฯ)
├── lib/
│   ├── api.ts              # API client และ interface ทั้งหมด — ใช้จากนี้เท่านั้น
│   └── auth.ts             # Auth helpers
└── types/                  # TypeScript types ที่ใช้ร่วมกัน
```

---

### 2. API Convention (`lib/api.ts`)

- **ห้าม fetch หรือ axios ตรงจาก page/component** — ทุก API call ต้องผ่าน function ใน `lib/api.ts` เสมอ
- แต่ละ resource มี object เป็น namespace: `requestApi`, `advisorApi`, `studentApi`, ฯลฯ
- Interface ของ API response กำหนดใน `api.ts` ด้วย prefix `Api`: `ApiRequest`, `ApiAdvisor`, ฯลฯ
- ห้าม map หรือ transform data ใน `api.ts` — return raw response ให้ page จัดการ

```ts
// ✅ ถูก — ใช้ผ่าน api.ts
import { requestApi } from '@/lib/api';
const { data } = await requestApi.getAll();

// ❌ ผิด — fetch ตรงใน component
const res = await fetch(`${BASE_URL}/requests`);
```

---

### 3. Page Convention

- ทุก page ที่ต้องการ auth ใช้ client component (`'use client'`) และดึง token จาก `localStorage`
- โหลดข้อมูลครั้งแรกใน `useEffect` — ห้ามโหลดข้อมูลใน render body โดยตรง
- แยก `loading` state ตาม concern และรวมกันด้วย `||` ห้ามใช้ flag เดียวสำหรับทุกอย่าง

```ts
// ✅ ถูก
const [loadingRequest, setLoadingRequest] = useState(true);
const [loadingAdvisor, setLoadingAdvisor] = useState(true);
const isLoading = loadingRequest || loadingAdvisor;

// ❌ ผิด
const [loading, setLoading] = useState(true); // ใช้สำหรับทุกอย่าง
```

- ทุก `async` call ใน `useEffect` ต้องมี `try/catch` และ set error state
- ห้าม redirect หรือ router.push โดยไม่ตรวจสอบ role ก่อน — ใช้ `middleware.ts` สำหรับ route protection

---

### 4. Component Convention

- **`src/components/ui/`** — Primitive ที่ใช้ร่วมกันทั้งระบบ (Button, StatusBadge, CustomSelect, DateSelect)
  - ใช้ component เหล่านี้ก่อนเขียน HTML element เอง
  - ถ้าต้องการ UI ใหม่ที่ใช้หลายที่ให้เพิ่มใน `ui/` ไม่ใช่ inline ใน page
- **`src/components/`** — Modal และ shared component ที่มี business logic
  - Modal ใช้ pattern: `isOpen` prop + `onClose` callback + `onSave` callback
  - Modal ที่ใช้ได้ทั้ง Add และ Edit ให้ใช้ component เดียว — ใช้ `isEdit = !!selectedItem` เป็น driver

```ts
// ✅ ถูก — modal เดียวสำหรับ add/edit
<AdvisorModal
  isOpen={isOpen}
  selectedAdvisor={selected}   // null = add mode, object = edit mode
  onClose={() => setSelected(null)}
  onSave={handleSave}
/>
```

---

### 5. Form & Validation Convention

- ทุก form ที่มีการ submit ต้องมี client-side validation ก่อนเรียก API
- เก็บ error เป็น `Record<string, string>` ใน state — แสดง error ใต้ input field (inline) ไม่ใช่ alert
- Clear error ของ field นั้นใน `onChange` handler
- ห้ามใช้ `alert()` หรือ `window.confirm()` สำหรับ form validation

```ts
// ✅ ถูก
const [errors, setErrors] = useState<Record<string, string>>({});

function validate() {
  const e: Record<string, string> = {};
  if (!firstName) e.firstName = 'กรุณากรอกชื่อ';
  if (!email) e.email = 'กรุณากรอก email';
  setErrors(e);
  return Object.keys(e).length === 0;
}

// ใน input
<input onChange={(e) => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: '' })); }} />
{errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
```

---

### 6. Dropdown & Select Convention

- ใช้ `CustomSelect` จาก `components/ui/CustomSelect.tsx` แทนการทำ dropdown เอง
- Dropdown ที่ค้นหาได้ต้องมี debounce ก่อน call API (ขั้นต่ำ 300ms)
- ห้าม fetch ข้อมูลทั้งหมดเพื่อแสดงใน dropdown ถ้า dataset มีขนาดใหญ่ — ใช้ server-side search แทน

---

### 7. Status Display Convention

- ใช้ `StatusBadge` จาก `components/ui/StatusBadge.tsx` สำหรับแสดงสถานะ request ทุกที่
- ห้าม hardcode สีหรือ label ของ status ใน page — ใช้ `statusConfig` object กลางที่กำหนด mapping ไว้แล้ว
- `statusConfig` ต้องครอบคลุม status ทุกค่าที่ Prisma enum กำหนดไว้ เพื่อไม่ให้เกิด fallback ผิดพลาด

```ts
// ✅ ถูก
const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:             { label: 'Pending',   color: 'yellow' },
  FORWARDED_TO_ADVISOR:{ label: 'Pending',   color: 'yellow' },
  ADVISOR_APPROVED:    { label: 'Approved',  color: 'green'  },
  ADVISOR_REJECTED:    { label: 'Rejected',  color: 'red'    },
  CANCELLED:           { label: 'Cancelled', color: 'gray'   },
  // ... ทุก status ต้องมี
};
```

---

### 8. Role-Based Rendering

- ดึง role จาก JWT ที่ decode แล้ว ไม่ใช่จาก API call แยก
- ตรวจสอบ role ก่อน render ปุ่ม action (approve, reject, edit, delete) ทุกครั้ง
- ห้ามซ่อน UI ด้วย CSS เพียงอย่างเดียวถ้า action นั้นเป็น security-sensitive — ต้องมี check ที่ backend ด้วยเสมอ

---

### 9. Routing (Next.js App Router)

- Route protection ทำที่ `src/middleware.ts` — ไม่ต้องทำซ้ำในแต่ละ page
- Dynamic route params ดึงจาก `params` prop: `const { id } = await params` (Next.js 15+)
- Layout ของแต่ละ role อยู่ที่ `app/[role]/layout.tsx` — ใส่ shared UI (sidebar, navbar) ที่นี่

---

### 10. กฎทั่วไป (Frontend)

- ห้าม hardcode URL ของ API ใน component — ใช้ผ่าน `lib/api.ts` ซึ่งอ่าน `NEXT_PUBLIC_API_URL` จาก env
- Token เก็บใน `localStorage` ภายใต้ key `'token'` — ดึงผ่าน `localStorage.getItem('token')` เท่านั้น
- เมื่อ API return 401 interceptor ใน `api.ts` จะ redirect ไป `/login` อัตโนมัติ — ไม่ต้องจัดการใน page
- ห้ามใช้ `any` type — ถ้ายังไม่รู้ type ให้ใช้ `unknown` แล้วค่อย narrow

---

## Infrastructure

- ใช้ `docker-compose.yml` เป็นหลักในการรันระบบ
- Environment variables ทั้งหมดกำหนดใน `.env` — ห้าม hardcode ค่าใน code
- Backend รันที่ port 4000, Frontend รันที่ port 3000 ตาม default
- ห้ามแก้ไข config เพื่อให้รัน dev ผ่านแล้วไม่คืนค่าก่อน commit

---

---

## Prisma Query Reference

> เขียน Prisma query ได้เฉพาะใน `src/repositories/` เท่านั้น

### รูปแบบพื้นฐาน

```ts
prisma.<modelName>.<method>(args)
// model name มาจาก schema — ตัวพิมพ์เล็ก camelCase เสมอ
// เช่น User → prisma.user, HealthInsurance → prisma.healthInsurance
```

---

### Methods หลัก

| Method | ใช้เมื่อ | return |
|---|---|---|
| `findUnique` | หา 1 record ด้วย unique field (`id`, `email`, `studentId`) | `T \| null` |
| `findFirst` | หา 1 record ด้วย condition ใดก็ได้ (ไม่ต้อง unique) | `T \| null` |
| `findMany` | หาหลาย records | `T[]` |
| `count` | นับจำนวน record | `number` |
| `create` | สร้าง record ใหม่ | `T` |
| `update` | แก้ไข record (ต้องมีอยู่แล้ว มิฉะนั้น throw P2025) | `T` |
| `upsert` | สร้างถ้าไม่มี / แก้ถ้ามี | `T` |
| `delete` | ลบ record (ต้องมีอยู่แล้ว มิฉะนั้น throw P2025) | `T` |

---

### findUnique

```ts
// หาด้วย primary key
prisma.user.findUnique({ where: { id: 1 } })

// หาด้วย unique field อื่น
prisma.user.findUnique({ where: { email: 'a@b.com' } })
prisma.passport.findUnique({ where: { studentId: 5 } })
```

### findFirst

```ts
// หา 1 record ที่ match condition (ไม่ต้อง unique)
prisma.user.findFirst({
  where: { role: 'STAFF', isActive: true },
  orderBy: { createdAt: 'asc' },
})

// OR condition
prisma.user.findFirst({
  where: { OR: [{ googleId: 'abc' }, { email: 'a@b.com' }] },
})
```

### findMany

```ts
prisma.student.findMany({
  where: { faculty: 'Engineering' },
  orderBy: { createdAt: 'desc' },
  skip: 0,   // offset — ใช้คู่กับ take สำหรับ pagination
  take: 10,  // limit
})
```

### create

```ts
prisma.student.create({
  data: {
    studentId: 'ST001',
    firstNameEn: 'Alice',
    lastNameEn: 'Smith',
    userId: 3,
  },
})
```

### update

```ts
prisma.student.update({
  where: { id: 1 },
  data: { firstNameEn: 'Bob', faculty: 'Science' },
})
```

### upsert

```ts
// สร้างถ้าไม่มี, แก้ถ้ามีอยู่แล้ว
prisma.passport.upsert({
  where: { studentId: 5 },
  create: { studentId: 5, passportNumber: 'AA123', issuingCountry: 'TH', issueDate: new Date(), expiryDate: new Date() },
  update: { passportNumber: 'AA123' },
})
```

### delete

```ts
prisma.visa.delete({ where: { id: 3 } })
```

---

### select — เลือกเฉพาะ field ที่ต้องการ

ใช้เมื่อไม่ต้องการ field ทั้งหมด (ลด payload และซ่อน sensitive field เช่น `password`)

```ts
prisma.user.findUnique({
  where: { id: 1 },
  select: { id: true, email: true, role: true },
  // return เฉพาะ 3 field นี้เท่านั้น
})
```

**กฎ:** `select` และ `include` ใช้พร้อมกันไม่ได้ในระดับเดียวกัน — เลือกอย่างใดอย่างหนึ่ง

---

### include — ดึง relation มาด้วย (max 1 ชั้น)

```ts
// ✅ 1 ชั้น — ถูกต้อง
prisma.student.findUnique({
  where: { id: 1 },
  include: { advisor: true },
})

// ✅ 1 ชั้น + select field ของ relation
prisma.student.findMany({
  include: {
    advisor: { select: { firstNameEn: true, lastNameEn: true } },
    visas:   { where: { status: 'ACTIVE' }, take: 1 },
  },
})

// ❌ ห้าม — nested include 2 ชั้น
prisma.student.findUnique({
  include: {
    advisor: {
      include: { user: true },  // ❌ ซ้อน include อีกชั้น
    },
  },
})
```

ถ้าต้องการข้อมูล 2 ชั้น ให้แยกเป็น 2 query แล้วรวม:

```ts
// ✅ แยก query แทน nested include
const student = await prisma.student.findUnique({ where: { id }, include: { advisor: true } });
const advisorUser = student?.advisor
  ? await prisma.user.findUnique({ where: { id: student.advisor.userId }, select: { email: true } })
  : null;
```

---

### where conditions

```ts
// เท่ากับ (default)
where: { status: 'ACTIVE' }

// OR
where: { OR: [{ googleId: 'abc' }, { email: 'a@b.com' }] }

// AND (default เมื่อใส่หลาย field)
where: { role: 'STAFF', isActive: true }

// contains (LIKE %...%)
where: { firstNameEn: { contains: 'John' } }

// relation filter — หา record ที่มี relation ตรง condition
where: { requestTypes: { some: { id: 2 } } }

// nested where ใน include
include: { visas: { where: { status: 'ACTIVE' }, take: 1 } }
```

---

### $transaction — atomic operations

ใช้เมื่อต้องการให้หลาย query สำเร็จพร้อมกัน หรือ rollback ทั้งหมดถ้า query ใดล้มเหลว

```ts
prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email, name, role: 'STUDENT' } });
  const student = await tx.student.create({ data: { userId: user.id, firstNameEn, lastNameEn } });
  return student;
})
// ถ้า student.create ล้มเหลว → user.create จะถูก rollback อัตโนมัติ
```

---

### Enums จาก `@prisma/client`

ทุก enum ที่ define ใน `schema.prisma` สามารถ import มาใช้เป็น TypeScript type ได้เลย:

```ts
import { Role, Gender, AcademicLevel, RegistrationStatus,
         VisaStatus, RequestStatus, DocumentType,
         InterserviceStatus, NotificationType } from '@prisma/client';

// ใช้เป็น type ใน DTO
export interface UpdateStudentDto {
  level?: AcademicLevel;           // BACHELOR | MASTER | PHD
  registrationStatus?: RegistrationStatus;  // PENDING_APPROVAL | REJECTED | ACTIVE
}
```

| Enum | Values |
|---|---|
| `Role` | `STUDENT`, `ADVISOR`, `STAFF` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` |
| `AcademicLevel` | `BACHELOR`, `MASTER`, `PHD` |
| `RegistrationStatus` | `PENDING_APPROVAL`, `REJECTED`, `ACTIVE` |
| `VisaStatus` | `ACTIVE`, `EXPIRED`, `PENDING`, `CANCELLED` |
| `RequestStatus` | `PENDING`, `FORWARDED_TO_ADVISOR`, `ADVISOR_APPROVED`, `ADVISOR_REJECTED`, `STAFF_APPROVED`, `STAFF_REJECTED`, `FORWARDED_TO_DEAN`, `DEAN_APPROVED`, `DEAN_REJECTED`, `CANCELLED` |
| `DocumentType` | `PASSPORT_COPY`, `VISA_COPY`, `TRANSCRIPT`, `INSURANCE`, `ENROLLMENT_CERTIFICATE`, `PHOTO`, `WORK_PERMIT`, `OTHER` |
| `InterserviceStatus` | `NOT_SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED` |
| `NotificationType` | `VISA_ALERT`, `REGISTRATION`, `REQUEST_UPDATE`, `DOCUMENT_REQUIRED`, `GENERAL` |

> source of truth คือ `backend/prisma/schema.prisma` — แก้ schema แล้วต้องรัน `npx prisma generate` เพื่อ update `@prisma/client`

---

> หากมีการเปลี่ยนแปลงข้อตกลงใดๆ ให้ตกลงในทีมก่อนเสมอ และอัปเดตเอกสารนี้ให้ทันสมัย
