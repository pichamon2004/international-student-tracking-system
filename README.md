# International Student Tracking System (IST)

ระบบติดตามและจัดการข้อมูลนักศึกษาต่างชาติ วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น

---

## สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [Tech Stack](#tech-stack)
3. [สถาปัตยกรรมระบบ](#สถาปัตยกรรมระบบ)
4. [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
5. [การติดตั้งและรัน](#การติดตั้งและรัน)
6. [Environment Variables](#environment-variables)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Backend — ไฟล์สำคัญ](#backend--ไฟล์สำคัญ)
10. [Frontend — ไฟล์สำคัญ](#frontend--ไฟล์สำคัญ)
11. [Python OCR Service](#python-ocr-service)
12. [User Roles & Permissions](#user-roles--permissions)
13. [Default Accounts (Seed)](#default-accounts-seed)
14. [External Services](#external-services)

---

## ภาพรวมระบบ

IST เป็นระบบ Web Application สำหรับจัดการข้อมูลนักศึกษาต่างชาติ ครอบคลุมตั้งแต่:

- **การลงทะเบียนนักศึกษา** แบบ 2 Phase (นักศึกษากรอกข้อมูลส่วนตัว → Staff อนุมัติ → Staff กรอกข้อมูลวิชาการ)
- **ติดตามเอกสารสำคัญ** ได้แก่ Passport, Visa, Health Insurance พร้อมระบบแจ้งเตือนอัตโนมัติก่อนหมดอายุ
- **ระบบยื่นคำร้อง** (Request/Petition) ที่มี workflow การอนุมัติผ่าน Advisor → Staff → Dean
- **สแกน Passport อัตโนมัติ** ด้วย OCR (MRZ line reading)
- **สร้าง Document Template** พร้อม variable แบบ WYSIWYG editor
- **ส่งอีเมลแจ้งเตือน** ผ่าน Resend API

---

## Tech Stack

### Frontend
| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|---|---|---|
| **Next.js** | 14 (App Router) | React framework, SSR/SSG, file-based routing |
| **TypeScript** | 5 | Type safety ทั้งโปรเจกต์ |
| **Tailwind CSS** | 3 | Utility-first CSS styling |
| **Axios** | 1.6 | HTTP client ติดต่อ Backend API |
| **Zustand** | 4 | Global state management (auth store) |
| **react-hot-toast** | 2 | Toast notification |
| **react-icons** | 5 | Icon library (Remix Icons) |
| **react-simple-maps** | 3 | World map visualization |
| **clsx** | 2 | Conditional className utility |

### Backend
| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|---|---|---|
| **Node.js + Express** | 18 / 4.18 | REST API server |
| **TypeScript** | 5 | Type safety |
| **Prisma ORM** | 5.10 | Database access layer, migrations, type-safe queries |
| **MySQL** | 8.0 | Relational database |
| **JWT (jsonwebtoken)** | 9 | Authentication token |
| **bcryptjs** | 2 | Password hashing |
| **Multer** | 1.4 | File upload middleware |
| **AWS SDK v3 (S3)** | 3 | Cloudflare R2 file storage (S3-compatible) |
| **Resend** | 6 | Transactional email sending |
| **node-cron** | 4 | Scheduled job สำหรับ daily expiry check |
| **helmet** | 7 | HTTP security headers |
| **express-rate-limit** | 8 | Rate limiting |
| **morgan** | 1 | HTTP request logging |
| **sanitize-html** | 2 | Sanitize HTML content ใน templates |
| **pdfkit** | 0.15 | PDF generation |
| **express-validator** | 7 | Input validation |

### Python Service
| เทคโนโลยี | หน้าที่ |
|---|---|
| **Flask** | Web framework สำหรับ OCR API |
| **passporteye** | MRZ (Machine Readable Zone) extraction จาก passport image |
| **Tesseract OCR** | ข้อความ OCR fallback |
| **Pillow** | Image processing |

### Infrastructure
| เทคโนโลยี | หน้าที่ |
|---|---|
| **Docker + Docker Compose** | Container orchestration |
| **Cloudflare R2** | Object storage (S3-compatible) สำหรับ file uploads |
| **Resend + pichamon.me** | Email delivery |

---

## สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (User)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP :3000
┌────────────────────────▼────────────────────────────────────────┐
│              Frontend — Next.js 14 App Router                   │
│  /student/**   /advisor/**   /staff/**   /login   /auth/**      │
│  Axios → Authorization: Bearer <JWT>                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP :4000
┌────────────────────────▼────────────────────────────────────────┐
│              Backend — Express REST API                         │
│  middleware: helmet → cors → rateLimit → morgan → auth(JWT)     │
│                                                                 │
│  /api/auth          /api/students      /api/advisors            │
│  /api/users         /api/templates     /api/request-types       │
│  /api/requests      /api/notifications /api/email-templates     │
│  /api/audit-logs    /api/visa-renewals /api/generated-documents │
└──────┬────────────────────────┬────────────────────────────────┘
       │ Prisma ORM             │ HTTP :5000
┌──────▼──────────┐   ┌─────────▼───────────────────────────────┐
│  MySQL 8.0      │   │   Python OCR Service — Flask             │
│  :3306          │   │   POST /scan-passport                    │
│  ist_db         │   │   passporteye + Tesseract                │
└─────────────────┘   └─────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│  Cloudflare R2 (S3-compatible object storage)                   │
│  ไฟล์: passport images, visa images, documents, photos          │
└─────────────────────────────────────────────────────────────────┘
```

---

## โครงสร้างโปรเจกต์

```
international-student-tracking-system/
├── docker-compose.yml          # รัน services ทั้งหมด
├── backend/
│   ├── Dockerfile
│   ├── .env.example            # template สำหรับ environment variables
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (source of truth)
│   │   ├── seed.ts             # Seed data เริ่มต้น
│   │   └── migrations/         # Auto-generated migration files
│   └── src/
│       ├── index.ts            # Entry point — Express app setup
│       ├── types/
│       │   └── index.ts        # AuthRequest, AuthPayload types
│       ├── utils/
│       │   ├── prisma.ts       # Prisma client singleton
│       │   └── templateRenderer.ts  # HTML template variable replacement
│       ├── middleware/
│       │   ├── auth.middleware.ts        # JWT authentication
│       │   ├── auditLog.middleware.ts    # Auto audit logging
│       │   ├── errorHandler.middleware.ts  # Global error handler
│       │   ├── ownership.middleware.ts  # Resource ownership check
│       │   ├── upload.middleware.ts     # Multer file upload config
│       │   └── validate.middleware.ts  # express-validator wrapper
│       ├── services/
│       │   ├── email.service.ts          # Resend API email sending
│       │   ├── notification.service.ts  # Create in-app notifications
│       │   ├── r2.service.ts            # Cloudflare R2 file storage
│       │   ├── scheduler.service.ts     # Daily expiry check cron job
│       │   └── kkuInterservice.service.ts  # KKU external API integration
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── student.controller.ts
│       │   ├── passport.controller.ts
│       │   ├── visa.controller.ts
│       │   ├── healthInsurance.controller.ts
│       │   ├── dependent.controller.ts
│       │   ├── document.controller.ts
│       │   ├── academicDocument.controller.ts
│       │   ├── template.controller.ts
│       │   ├── requestType.controller.ts (implied)
│       │   ├── request.controller.ts
│       │   ├── generatedDoc.controller.ts
│       │   ├── emailTemplate.controller.ts
│       │   ├── notification.controller.ts
│       │   ├── visaRenewal.controller.ts
│       │   ├── auditLog.controller.ts
│       │   ├── interservice.controller.ts
│       │   ├── studentEmail.controller.ts
│       │   └── user.controller.ts
│       └── routes/
│           ├── auth.routes.ts
│           ├── advisor.routes.ts
│           ├── student.routes.ts
│           ├── passport.routes.ts
│           ├── visa.routes.ts
│           ├── healthInsurance.routes.ts
│           ├── dependent.routes.ts
│           ├── document.routes.ts
│           ├── academicDocument.routes.ts
│           ├── template.routes.ts
│           ├── requestType.routes.ts (implied)
│           ├── request.routes.ts
│           ├── generatedDoc.routes.ts
│           ├── emailTemplate.routes.ts
│           ├── notification.routes.ts
│           ├── visaRenewal.routes.ts
│           ├── auditLog.routes.ts
│           ├── interservice.routes.ts
│           ├── studentEmail.routes.ts
│           ├── user.routes.ts
│           └── dev.routes.ts
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── public/
│   │   └── kkulogo2.png        # โลโก้ KKU สำหรับ document template
│   └── src/
│       ├── middleware.ts        # Next.js route protection middleware
│       ├── app/                 # Next.js App Router pages
│       │   ├── layout.tsx       # Root layout (font, toaster)
│       │   ├── page.tsx         # Root redirect → /login
│       │   ├── login/
│       │   │   └── page.tsx     # Login page (email/password + Google OAuth)
│       │   ├── auth/
│       │   │   └── callback/page.tsx  # Google OAuth callback handler
│       │   ├── dev/
│       │   │   └── page.tsx     # Dev tools page (dev environment only)
│       │   ├── student/
│       │   │   ├── layout.tsx   # Student layout — registration gate
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── pending/page.tsx   # หน้ารอ approval
│       │   │   ├── register/page.tsx  # Phase 1 registration form
│       │   │   ├── profile/
│       │   │   │   ├── page.tsx       # Profile overview (tabs)
│       │   │   │   ├── (information)/
│       │   │   │   │   ├── personal/page.tsx
│       │   │   │   │   ├── passport/page.tsx
│       │   │   │   │   ├── visa/page.tsx
│       │   │   │   │   ├── health-insurance/page.tsx
│       │   │   │   │   ├── dependent/page.tsx
│       │   │   │   │   └── academic/page.tsx
│       │   │   │   └── (forms)/
│       │   │   │       ├── updatepersonal/page.tsx
│       │   │   │       ├── updatepassport/page.tsx
│       │   │   │       ├── updatevisa/page.tsx
│       │   │   │       ├── updatehealth-insurance/page.tsx
│       │   │   │       ├── updatedependent/page.tsx
│       │   │   │       └── updateacademic/page.tsx
│       │   │   └── request/
│       │   │       ├── page.tsx         # รายการคำร้องของตัวเอง
│       │   │       ├── [id]/page.tsx    # รายละเอียดคำร้อง
│       │   │       └── new/[typeId]/page.tsx  # ยื่นคำร้องใหม่ + document preview
│       │   ├── advisor/
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── profile/page.tsx
│       │   │   ├── students/
│       │   │   │   ├── page.tsx         # รายชื่อนักศึกษาในความดูแล
│       │   │   │   └── [id]/page.tsx    # รายละเอียดนักศึกษา
│       │   │   └── request/
│       │   │       ├── page.tsx
│       │   │       └── [id]/page.tsx
│       │   └── staff/
│       │       ├── layout.tsx
│       │       ├── dashboard/page.tsx
│       │       ├── students/
│       │       │   ├── page.tsx
│       │       │   └── [id]/page.tsx
│       │       ├── advisors/
│       │       │   ├── page.tsx
│       │       │   └── [id]/edit/page.tsx
│       │       ├── teachers/
│       │       │   └── [id]/page.tsx
│       │       ├── request/
│       │       │   ├── page.tsx
│       │       │   └── [id]/page.tsx
│       │       ├── notification/page.tsx  # Alert management
│       │       └── settings/page.tsx      # Document & Email templates
│       ├── components/
│       │   ├── layout/
│       │   │   ├── RoleLayout.tsx      # Shared layout wrapper (navbar + footer)
│       │   │   ├── RoleNavbar.tsx      # Top navbar พร้อม notification bell
│       │   │   ├── Sidebar.tsx         # Side navigation menu
│       │   │   └── DashboardLayout.tsx # Dashboard-specific layout
│       │   ├── ui/
│       │   │   ├── Button.tsx          # Reusable button component
│       │   │   ├── Container.tsx       # Max-width container
│       │   │   ├── CustomSelect.tsx    # Dropdown select component
│       │   │   ├── DateSelect.tsx      # Date picker (day/month/year selects)
│       │   │   ├── StatusBadge.tsx     # Colored status pill badge
│       │   │   └── StudentWorldMap.tsx # React-simple-maps world map
│       │   ├── DocTemplateModal.tsx    # WYSIWYG document template editor
│       │   ├── EmailTemplateModal.tsx  # Email template editor
│       │   ├── FollowUpModal.tsx       # ส่ง follow-up email ไปหานักศึกษา
│       │   ├── AddAdvisorModal.tsx     # เพิ่ม advisor modal
│       │   └── RenewalDetailModal.tsx  # Visa renewal detail modal
│       ├── lib/
│       │   ├── api.ts              # Axios instance + typed API functions ทั้งหมด
│       │   ├── auth.ts             # Zustand auth store (login/logout/user state)
│       │   ├── mockRequestData.ts  # Type definitions สำหรับ request form
│       │   └── progressStore.ts    # Zustand store สำหรับ registration progress
│       └── types/
│           ├── index.ts            # Shared TypeScript types
│           └── react-simple-maps.d.ts  # Type declarations สำหรับ map library
└── python-service/
    ├── Dockerfile
    ├── requirements.txt
    ├── app.py              # Flask app entry point
    └── passport_scanner.py # MRZ + OCR scanning logic
```

---

## การติดตั้งและรัน

### วิธีที่ 1: Docker Compose (แนะนำ)

```bash
# 1. Clone repository
git clone <repo-url>
cd international-student-tracking-system

# 2. ตั้งค่า environment variables
cp backend/.env.example backend/.env
# แก้ไขค่าใน backend/.env ตามที่ต้องการ

# 3. Build และ start ทุก services
docker compose up --build -d

# 4. ตรวจสอบ services
docker compose ps

# 5. ดู logs
docker compose logs -f backend
```

Services จะรันที่:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Python OCR**: http://localhost:5002
- **MySQL**: localhost:3306

> **หมายเหตุ**: ครั้งแรกที่รัน backend จะ run migration และ seed data อัตโนมัติ

เมื่อแก้ไข code ต้อง rebuild:
```bash
# rebuild frontend เท่านั้น
docker compose build frontend && docker compose up -d frontend

# rebuild backend เท่านั้น
docker compose build backend && docker compose up -d backend

# rebuild ทุกอย่าง (no cache)
docker compose build --no-cache && docker compose up -d
```

---

### วิธีที่ 2: Local Development (ไม่ใช้ Docker)

#### Backend

```bash
cd backend

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment
cp .env.example .env
# แก้ไข DATABASE_URL ให้ชี้ไปยัง MySQL ที่รันอยู่ใน local

# สร้าง database schema
npx prisma migrate dev

# ใส่ seed data
npm run prisma:seed

# รัน development server (hot reload)
npm run dev
```

Backend commands อื่นๆ:
```bash
npm run build           # Compile TypeScript → dist/
npm start               # รัน compiled JS (production)
npx prisma studio       # Prisma GUI (port 5555)
npm run prisma:reset    # ล้าง DB และ seed ใหม่
```

#### Frontend

```bash
cd frontend

npm install

# สร้าง .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api" > .env.local

npm run dev   # http://localhost:3000
npm run build # Build for production
npm start     # รัน production build
```

#### Python Service

```bash
cd python-service

pip install -r requirements.txt
# ต้องมี Tesseract ติดตั้งใน system ด้วย:
# macOS: brew install tesseract
# Ubuntu: apt install tesseract-ocr

python app.py   # http://localhost:5000
```

---

## Environment Variables

สร้างไฟล์ `backend/.env` โดย copy จาก `backend/.env.example`:

```env
# ─── Database ───────────────────────────────────────────────────
DATABASE_URL="mysql://user:password@localhost:3306/ist_db"

# ─── JWT Authentication ─────────────────────────────────────────
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"

# ─── Server ─────────────────────────────────────────────────────
PORT=4000
NODE_ENV=development          # development | production
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:4000"
PYTHON_SERVICE_URL="http://localhost:5000"
UPLOAD_DIR="./uploads"        # fallback สำหรับ local (ถ้าไม่ใช้ R2)

# ─── Google OAuth ───────────────────────────────────────────────
# สร้างได้ที่ https://console.cloud.google.com/ → APIs & Services → Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ─── Cloudflare R2 (S3-compatible storage) ──────────────────────
# สร้างได้ที่ Cloudflare Dashboard → R2 → Manage API Tokens
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="ist-documents"
R2_PUBLIC_URL="https://your-bucket.your-subdomain.r2.dev"

# ─── Email (Resend) ─────────────────────────────────────────────
# สร้าง API Key ได้ที่ https://resend.com
# ต้องยืนยัน domain ก่อนส่งออก
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="IST System <noreply@your-domain.com>"

# ─── Dev Tools (optional) ───────────────────────────────────────
DEV_SECRET="some-secret"      # เปิด /api/dev routes ถ้าตั้งค่านี้ไว้
```

---

## Database Schema

ระบบใช้ MySQL 8.0 โดย Prisma ORM จัดการ schema ทั้งหมด

### Models หลัก

#### `User`
บัญชีผู้ใช้ทุกประเภท (Student, Advisor, Staff)
- `id`, `email` (unique), `password?`, `googleId?`
- `name`, `phone?`, `image?`
- `role`: `STUDENT | ADVISOR | STAFF`
- `isActive`: ปิด/เปิดการใช้งาน

#### `Student`
ข้อมูลนักศึกษาต่างชาติ (ผูกกับ `User` แบบ 1:1)
- ชื่อ-นามสกุล (EN), วันเกิด, เพศ, สัญชาติ, ศาสนา
- ที่อยู่ในไทย, ที่อยู่บ้านเกิด
- ผู้ติดต่อฉุกเฉิน
- ข้อมูลวิชาการ: คณะ, หลักสูตร, ระดับการศึกษา, ทุน
- `registrationStatus`: `PENDING_APPROVAL | REJECTED | ACTIVE`
- `registrationStep`: 0 (ยังไม่เริ่ม) → 1 (Phase 1 submitted) → 2 (Phase 2 submitted)
- `advisorId`: FK → Advisor

#### `Advisor`
ข้อมูลอาจารย์ที่ปรึกษา (ผูกกับ `User` แบบ 1:1)
- ชื่อ, สัญชาติ, คณะ, เบอร์โทร
- Work Permit: เลขที่, วันออก, วันหมดอายุ, ไฟล์
- `isDean`: ระบุว่าเป็น Dean หรือไม่

#### `Passport`
ข้อมูล Passport ของนักศึกษา
- เลขที่ Passport, ประเทศออก, วันออก, วันหมดอายุ
- MRZ Line 1 & 2 (จาก OCR)
- `imageUrl`: URL รูปใน R2
- `isCurrent`: Passport ที่ใช้งานอยู่

#### `Visa`
ข้อมูล Visa ของนักศึกษา
- ประเภท Visa, สถานะ (`ACTIVE | EXPIRED | PENDING | CANCELLED`)
- ประเทศออก, วันออก, วันหมดอายุ
- รูป Visa, รูปขาเข้า, รูปขาออก
- `isCurrent`: Visa ที่ใช้งานอยู่

#### `HealthInsurance`
ประกันสุขภาพ
- บริษัทประกัน, เลขกรมธรรม์
- วันเริ่ม, วันหมดอายุ, ไฟล์
- `isCurrent`

#### `Dependent`
ผู้ติดตาม (ครอบครัว)
- ความสัมพันธ์, ชื่อ, วันเกิด, เพศ, สัญชาติ
- Passport + Visa ของผู้ติดตาม

#### `Document`
ไฟล์เอกสารทั่วไป (passport copy, visa copy, transcript ฯลฯ)
- `documentType`: `PASSPORT_COPY | VISA_COPY | TRANSCRIPT | INSURANCE | ENROLLMENT_CERTIFICATE | PHOTO | WORK_PERMIT | OTHER`
- `fileUrl`: URL ใน R2

#### `DocumentTemplate`
Template เอกสารราชการที่ Staff สร้าง
- `body`: HTML content พร้อม `{{variable}}` placeholders
- `variables`: JSON array ของ variable tokens ที่ใช้ใน template

#### `RequestType`
ประเภทคำร้อง (Staff กำหนด) เช่น "Leave Request", "Enrollment Certificate"
- เชื่อมกับ `DocumentTemplate` หลายตัวได้

#### `Request`
คำร้องที่นักศึกษายื่น
- `formData`: JSON ข้อมูลที่นักศึกษากรอก
- `status`: `PENDING → FORWARDED_TO_ADVISOR → ADVISOR_APPROVED → STAFF_APPROVED → FORWARDED_TO_DEAN → DEAN_APPROVED`
- บันทึก comment และ timestamp ของแต่ละ reviewer

#### `EmailTemplate`
Template อีเมลที่ Staff สร้างสำหรับ follow-up notifications
- `subject`, `body` (HTML), `variables`

#### `Notification`
In-app notification
- `type`: `VISA_ALERT | REGISTRATION | REQUEST_UPDATE | DOCUMENT_REQUIRED | GENERAL`
- `isRead`, `link`

#### `AuditLog`
บันทึกการกระทำของ user ทุกคน (auto-generated โดย middleware)
- `action`, `entity`, `entityId`, `before`, `after`

#### `VisaRenewal`
ติดตามสถานะการต่อ Visa
- `daysRemaining`, `isResolved`

#### `InterserviceCheck`
ติดตามการส่งข้อมูลไปยังระบบภายนอก KKU
- `status`: `NOT_SUBMITTED | PENDING | APPROVED | REJECTED`

---

## API Endpoints

Base URL: `http://localhost:4000/api`

### Authentication
```
POST   /auth/login              # Login ด้วย email/password → JWT
GET    /auth/me                 # ดึงข้อมูล user ปัจจุบัน
POST   /auth/google             # Google OAuth login
POST   /auth/logout             # Logout (clear cookie)
PUT    /auth/change-password    # เปลี่ยน password
```

### Students
```
GET    /students                # รายการนักศึกษา (STAFF/ADVISOR)
POST   /students                # สร้าง student (pre-register) — STAFF only
GET    /students/me             # ข้อมูล student ของตัวเอง
POST   /students/register       # Phase 1 registration — STUDENT
PUT    /students/me/submit-phase2  # ส่ง Phase 2 — STUDENT
GET    /students/:id            # ดึงข้อมูล student by ID
PUT    /students/:id            # แก้ไขข้อมูล — STAFF
DELETE /students/:id            # ลบ student — STAFF
PUT    /students/:id/approve    # อนุมัติ Phase 1/2 — STAFF
PUT    /students/:id/reject     # ปฏิเสธ — STAFF
POST   /students/:id/photo      # อัปโหลดรูปโปรไฟล์
POST   /students/:id/send-email # ส่ง follow-up email ไปหานักศึกษา
```

### Passport
```
GET    /students/:id/passport          # ดึง passport ปัจจุบัน
PUT    /students/:id/passport          # แก้ไข/เพิ่ม passport
POST   /students/:id/passport/scan     # สแกน OCR จาก image → Python service
DELETE /students/:id/passport          # ลบ passport
```

### Visa
```
GET    /students/:id/visas             # ดึง visa ทั้งหมด
POST   /students/:id/visas             # เพิ่ม visa ใหม่
PUT    /students/:id/visas/:visaId     # แก้ไข visa
DELETE /students/:id/visas/:visaId     # ลบ visa
```

### Health Insurance
```
GET    /students/:id/health-insurances
POST   /students/:id/health-insurances
PUT    /students/:id/health-insurances/:insId
DELETE /students/:id/health-insurances/:insId
```

### Dependents
```
GET    /students/:id/dependents
POST   /students/:id/dependents
PUT    /students/:id/dependents/:depId
DELETE /students/:id/dependents/:depId
```

### Documents
```
GET    /students/:id/documents
POST   /students/:id/documents         # Upload file → R2
DELETE /students/:id/documents/:docId
```

### Academic Documents
```
GET    /students/:id/academic-documents
POST   /students/:id/academic-documents
DELETE /students/:id/academic-documents/:docId
```

### Document Templates
```
GET    /templates                      # รายการ templates
POST   /templates                      # สร้าง template — STAFF
GET    /templates/:id                  # ดึง template by ID
PUT    /templates/:id                  # แก้ไข template — STAFF
DELETE /templates/:id                  # ลบ template — STAFF
```

### Request Types
```
GET    /request-types
POST   /request-types                  # STAFF only
PUT    /request-types/:id              # STAFF only
DELETE /request-types/:id             # STAFF only
```

### Requests (Petitions)
```
GET    /requests                       # รายการคำร้อง (filtered by role)
POST   /requests                       # ยื่นคำร้องใหม่ — STUDENT
GET    /requests/:id
PUT    /requests/:id/status            # อัพเดตสถานะ — ADVISOR/STAFF
GET    /requests/:id/document          # ดึง generated document ของคำร้อง
```

### Generated Documents
```
GET    /generated-documents
POST   /generated-documents            # สร้าง document จาก template
GET    /generated-documents/:id
```

### Email Templates
```
GET    /email-templates
POST   /email-templates               # STAFF only
PUT    /email-templates/:id           # STAFF only
DELETE /email-templates/:id           # STAFF only
```

### Notifications
```
GET    /notifications                  # Notifications ของ user ปัจจุบัน
PUT    /notifications/:id/read        # Mark as read
PUT    /notifications/read-all        # Mark all as read
DELETE /notifications/:id
```

### Advisors
```
GET    /advisors/me                    # ข้อมูล advisor ปัจจุบัน + รายชื่อนักศึกษา
GET    /advisors
POST   /advisors                       # STAFF only
PUT    /advisors/:id
DELETE /advisors/:id
```

### Users (STAFF only)
```
GET    /users
POST   /users
PUT    /users/:id
DELETE /users/:id
```

### Visa Renewals
```
GET    /visa-renewals                  # รายการที่ต้องต่อ Visa
GET    /students/:id/visa-renewal      # Visa renewal status ของนักศึกษา
POST   /students/:id/interservice      # ส่งข้อมูลไป KKU
```

### Audit Logs (STAFF only)
```
GET    /audit-logs
```

### Health Check
```
GET    /health                         # {"status":"ok"}
```

---

## Backend — ไฟล์สำคัญ

### `src/index.ts`
Entry point ของ Express application
- โหลด dotenv, validate required env vars (`DATABASE_URL`, `JWT_SECRET`)
- ตั้งค่า middleware ทั้งหมด: helmet, cors, rate limiting, morgan, cookieParser
- Mount routes ทั้งหมด
- เรียก `startScheduler()` เมื่อ server start
- Rate limiting: global 200 req/min, auth 20 req/15min

### `prisma/schema.prisma`
Database schema — ไฟล์นี้เป็น source of truth ของ database
- แก้ไขที่นี่แล้วรัน `npx prisma migrate dev` เพื่ออัพเดต DB

### `prisma/seed.ts`
Seed data เริ่มต้น — สร้าง accounts ทดสอบ, request types, email templates

### `src/middleware/auth.middleware.ts`
- `authenticate`: ตรวจสอบ JWT token จาก `Authorization: Bearer <token>` header
- `requireRole(...roles)`: ตรวจสอบ role ของ user ก่อนเข้า endpoint
- Token มี payload: `{ userId, email, role, name }`

### `src/middleware/upload.middleware.ts`
Multer configuration สำหรับ file upload
- รับไฟล์ใน memory (buffer) ก่อน upload ไป R2
- จำกัดขนาดไฟล์

### `src/middleware/auditLog.middleware.ts`
Auto-log ทุก POST/PUT/DELETE request ลง `audit_logs` table
- บันทึก user, action, entity, before/after data

### `src/middleware/errorHandler.middleware.ts`
Global error handler — จัดการ error ทั้งหมดที่ไม่ได้ catch
- Return JSON response พร้อม status code ที่เหมาะสม

### `src/middleware/ownership.middleware.ts`
ตรวจสอบว่า user มีสิทธิ์เข้าถึง resource นั้นๆ ไหม
- Student เข้าถึงได้เฉพาะข้อมูลของตัวเอง

### `src/services/email.service.ts`
ส่งอีเมลผ่าน Resend API
- `sendEmail(to, subject, html)`: ส่งอีเมล HTML
- `sendTemplateEmail(to, templateId, vars)`: ส่งโดยใช้ template จาก DB

### `src/services/scheduler.service.ts`
Cron job รันทุกวันเวลา 08:00
- **checkVisaExpiry**: ตรวจ Visa ที่จะหมดอายุใน 7, 15, 30, 60, 90 วัน → ส่ง notification + email ทั้งนักศึกษาและ advisor
- **checkPassportExpiry**: ตรวจ Passport ที่จะหมดอายุ → ส่ง notification
- **checkHealthInsuranceExpiry**: ตรวจประกันสุขภาพ → ส่ง notification
- **checkDependentExpiry**: ตรวจ passport/visa ของผู้ติดตาม → ส่ง notification

### `src/services/r2.service.ts`
Cloudflare R2 (S3-compatible) file storage
- `uploadToR2(buffer, filename, contentType, folder)`: อัปโหลดไฟล์ → return public URL
- `deleteFromR2(key)`: ลบไฟล์
- `getPresignedUrl(key, expires)`: สร้าง signed URL สำหรับ private files

### `src/services/notification.service.ts`
- `createNotification(data)`: สร้าง notification 1 รายการ
- `createNotifications(userIds[], data)`: สร้าง notifications หลายคนพร้อมกัน

### `src/utils/templateRenderer.ts`
แทนที่ `{{variable}}` ใน HTML template ด้วยค่าจริงของนักศึกษา
- รองรับทั้ง `{{variable}}` tokens และ `data-var` chip format

### `src/utils/prisma.ts`
Singleton Prisma client — ป้องกัน connection leak ใน development

---

## Frontend — ไฟล์สำคัญ

### `src/middleware.ts`
Next.js Edge Middleware — รันก่อน render ทุก request
- ตรวจสอบ JWT token จาก cookie
- Redirect ไป `/login` ถ้าไม่ได้ login
- Redirect ไปหน้าที่ถูกต้องตาม role (`/student`, `/advisor`, `/staff`)
- ป้องกัน student ที่ยังไม่ผ่าน registration เข้าหน้าอื่น

### `src/lib/api.ts`
Central API layer — ทุก HTTP call ผ่านไฟล์นี้
- สร้าง Axios instance พร้อม base URL และ JWT interceptor อัตโนมัติ
- Export typed API functions สำหรับทุก resource:
  - `studentApi`, `passportApi`, `visaApi`, `healthInsuranceApi`
  - `dependentApi`, `documentApi`, `advisorApi`, `requestApi`
  - `requestTypeApi`, `templateApi`, `emailTemplateApi`
  - `notificationApi`, `generatedDocApi`, `studentMeApi`, `userApi`
- Export TypeScript interfaces: `ApiStudent`, `ApiAdvisor`, `ApiVisa`, `ApiPassport`, `ApiStudentWithExpiry` ฯลฯ

### `src/lib/auth.ts`
Zustand store สำหรับ authentication state
- `user`: ข้อมูล user ปัจจุบัน (`{ userId, email, role, name }`)
- `token`: JWT token
- `login(token, user)`: เก็บ token ใน localStorage + cookie
- `logout()`: ล้าง state และ redirect
- `initialize()`: โหลด token จาก localStorage เมื่อ app start

### `src/app/login/page.tsx`
หน้า Login
- Login ด้วย Email/Password → POST `/api/auth/login`
- Login ด้วย Google OAuth
- Redirect ตาม role หลัง login สำเร็จ

### `src/app/student/layout.tsx`
Student layout guard
- ตรวจ `registrationStatus` และ `registrationStep`
- Redirect ไป `/student/register` ถ้ายังไม่ลงทะเบียน
- Redirect ไป `/student/pending` ถ้ารอการอนุมัติ

### `src/app/student/register/page.tsx`
ฟอร์ม Phase 1 Registration
- นักศึกษากรอกข้อมูลส่วนตัว, ที่อยู่, ผู้ติดต่อฉุกเฉิน
- Submit → POST `/api/students/register`

### `src/app/student/request/new/[typeId]/page.tsx`
หน้ายื่นคำร้องใหม่ — ซับซ้อนที่สุดใน frontend
- โหลด request type + document templates
- ฟอร์มให้นักศึกษากรอก variables ของ template
- **DocumentPreviewModal**: Preview เอกสาร A4 พร้อม signature block
- Print: เปิด new window พร้อมแค่เนื้อหาเอกสาร (ไม่มี UI)
- Auto-fill ข้อมูลนักศึกษาจาก profile

### `src/app/staff/notification/page.tsx`
Alert Management สำหรับ Staff
- ดึงนักศึกษาทั้งหมด → คำนวณวันหมดอายุของ Visa, Passport, Health Insurance
- แสดงตาราง sorted by days remaining
- Color coding: แดง < 14 วัน, เหลือง 14-45 วัน, เขียว > 45 วัน
- Filter by type (Visa/Passport/Health Insurance) และ status
- ปุ่ม "Follow Up" → ส่ง email ผ่าน template

### `src/app/staff/settings/page.tsx`
Settings หน้าเดียวแต่จัดการ 2 ส่วน:
1. **Document Templates**: สร้าง/แก้ไข template เอกสาร (ใช้ `DocTemplateModal`)
2. **Email Templates**: สร้าง/แก้ไข template อีเมล (ใช้ `EmailTemplateModal`)

### `src/components/DocTemplateModal.tsx`
WYSIWYG editor สำหรับ Document Template — ไฟล์ที่ซับซ้อนที่สุดใน frontend
- **Editor tab**: `contentEditable` div พร้อม formatting toolbar (Bold, Italic, font size, alignment)
- **Preview tab**: Render HTML template พร้อม variable chips
- **Variable panel**: Click เพื่อแทรก variable `{{student_name}}` เป็น chip
- **KKU Logo**: แทรกรูปโลโก้ KKU ขนาด S/M/L
- **Signature section**: เปิด/ปิด signature slots (Student, Advisor, IR Staff, Dean)
- Print: เปิด new window → print เฉพาะ document content
- Save: เก็บ HTML body + variables list ลง DB

### `src/components/FollowUpModal.tsx`
Modal สำหรับส่ง follow-up email
- โหลด email templates ที่ active
- Dropdown เลือก template + preview subject/body
- ส่ง email ไปหานักศึกษา via POST `/api/students/:id/send-email`

### `src/components/layout/RoleNavbar.tsx`
Top navbar สำหรับทุก role
- Notification bell พร้อม unread count badge
- Dropdown notifications list
- User avatar + logout button

### `src/components/layout/RoleLayout.tsx`
Wrapper layout หลัก
- Blue background header (absolute positioned, ไม่มี z-index เพื่อป้องกัน stacking context ปิดกั้น modal)
- Navbar + main content + footer

### `src/components/ui/StudentWorldMap.tsx`
World map แสดงการกระจายนักศึกษาตามประเทศ
- ใช้ react-simple-maps
- Tooltip แสดงชื่อประเทศและจำนวนนักศึกษา

---

## Python OCR Service

### `app.py`
Flask web server
- `GET /health`: Health check
- `POST /scan-passport`: รับ image file → เรียก `scan_passport_image()` → return ข้อมูล MRZ

### `passport_scanner.py`
OCR logic
- ใช้ **passporteye** อ่าน MRZ (Machine Readable Zone) 2 บรรทัดล่างของ passport
- Parse: passport number, nationality, date of birth, expiry date, gender, name
- Fallback: Tesseract OCR ถ้า passporteye ล้มเหลว

เรียกใช้จาก backend ที่ `POST /api/students/:id/passport/scan`:
```
Backend → POST http://python-service:5000/scan-passport (multipart/form-data)
       ← { success: true, data: { passportNumber, nationality, expiryDate, ... } }
```

---

## User Roles & Permissions

| Action | Student | Advisor | Staff |
|--------|---------|---------|-------|
| ดูข้อมูลตัวเอง | ✅ | ✅ | ✅ |
| แก้ไขข้อมูลตัวเอง | ✅ | ✅ | ✅ |
| ดูรายชื่อนักศึกษาทั้งหมด | ❌ | เฉพาะในความดูแล | ✅ |
| สร้าง/ลบ student account | ❌ | ❌ | ✅ |
| อนุมัติ/ปฏิเสธ registration | ❌ | ❌ | ✅ |
| ยื่นคำร้อง | ✅ | ❌ | ❌ |
| อนุมัติคำร้อง | ❌ | ✅ | ✅ |
| สร้าง Document Template | ❌ | ❌ | ✅ |
| สร้าง Email Template | ❌ | ❌ | ✅ |
| ส่ง Follow-up Email | ❌ | ❌ | ✅ |
| ดู Audit Logs | ❌ | ❌ | ✅ |
| จัดการ Advisor | ❌ | ❌ | ✅ |

---

## Default Accounts (Seed)

หลังรัน `npm run prisma:seed` จะมี accounts ต่อไปนี้:

| Role | Email | Password |
|------|-------|----------|
| Staff | `staff@ist.local` | `staff1234` |
| Advisor | สร้างผ่าน Staff | — |
| Student | สร้างผ่าน Staff | — |

> ⚠️ เปลี่ยน password ก่อน deploy production

---

## External Services

### Cloudflare R2
Object storage สำหรับเก็บไฟล์อัปโหลด (passport images, visa images, documents, profile photos)
- S3-compatible API ใช้ AWS SDK v3
- ไฟล์ถูกเก็บในรูปแบบ: `{folder}/{uuid}.{ext}`
- Folders: `photos/`, `documents/`, `passports/`, `visas/`

**ตั้งค่า:**
1. ไปที่ Cloudflare Dashboard → R2 → Create bucket
2. สร้าง API Token ที่มี R2 Read/Write permission
3. ใส่ค่าใน `.env`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Resend (Email)
ส่ง transactional email สำหรับ:
- Follow-up notifications ไปหานักศึกษา
- Visa expiry alerts (auto จาก scheduler)
- Passport/Insurance expiry alerts

**ตั้งค่า:**
1. สมัครที่ https://resend.com
2. Verify domain (เพิ่ม DNS records: MX, SPF TXT, DKIM TXT)
3. สร้าง API Key
4. ใส่ค่าใน `.env`: `RESEND_API_KEY`, `EMAIL_FROM`

### Google OAuth (Optional)
Login ด้วย Google account
1. ไปที่ Google Cloud Console → APIs & Services → Credentials
2. สร้าง OAuth 2.0 Client ID
3. ตั้ง Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`
4. ใส่ค่าใน `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## หมายเหตุสำหรับ Developer

- **Docker build ใหม่ทุกครั้งที่แก้ code** (ไม่มี hot-reload ใน production mode):
  ```bash
  docker compose build frontend && docker compose up -d frontend
  ```

- **Prisma migration** หลังแก้ `schema.prisma`:
  ```bash
  npx prisma migrate dev --name describe-your-change
  ```

- **ดู logs แบบ real-time**:
  ```bash
  docker compose logs -f backend
  docker compose logs -f frontend
  ```

- **Reset database** (ล้างข้อมูลทั้งหมดแล้ว seed ใหม่):
  ```bash
  # inside backend container
  npm run prisma:reset
  ```

- **Scheduler** รันทุกวัน 08:00 — test ได้โดยเรียก function โดยตรงใน dev environment
