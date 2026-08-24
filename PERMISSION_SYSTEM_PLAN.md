# Permission System Implementation Plan

แผนการเพิ่มระบบ Permission และ Multi-Role สำหรับ International Student Tracking System  
อ้างอิงจากแนวทางของระบบ sook (Role → RolePermission → Permission ← Module)

---

## สรุปสิ่งที่จะเปลี่ยน

| ส่วน | สิ่งที่เปลี่ยน |
|------|---------------|
| Database | เพิ่ม 5 table ใหม่, ลบ `Role` enum, เก็บ `User.role` ไว้ระหว่าง migrate |
| Backend Auth | JWT ใหม่มี `activeRole` + `permissions[]`, เพิ่ม select-role endpoint |
| Backend Middleware | เพิ่ม `requirePermission()`, แก้ `requireRole()` ให้รองรับ table-based role |
| Backend Routes | เพิ่ม routes จัดการ Role/Module/Permission, อัปเดต permission guard ทุก route |
| Frontend Auth Store | เพิ่ม `activeRole`, `permissions[]`, `roles[]`, `hasPermission()` |
| Frontend Pages | เพิ่มหน้า Role Selection, หน้าจัดการ Permission (สำหรับ STAFF) |

---

## Phase 1 — Database

### 1.1 Table ใหม่ที่จะเพิ่ม

#### `roles`
```prisma
model Role {
  id          Int              @id @default(autoincrement())
  code        String           @unique   // "STUDENT", "ADVISOR", "STAFF", "SUB_STAFF"
  name        String                     // ชื่อแสดงผล เช่น "เจ้าหน้าที่"
  description String?
  isActive    Boolean          @default(true)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  userRoles   UserRole[]            // relation
  permissions RolePermission[]      // relation

  @@map("roles")                    // model นี้ใน code เรียกว่า Role แต่ใน database ตารางชื่อ roles
}
```

#### `user_roles`
```prisma
model UserRole {
  id        Int      @id @default(autoincrement())
  userId    Int
  roleId    Int
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade) // เชื่อมกับ userid ของตารางนี้ และ id ของตาราง user ถ้าลบจะลบหมด // ใครถือ FK คนนั้นเขียนเต็ม
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade) // ใครถือ FK คนนั้นเขียนเต็ม

  @@unique([userId, roleId])
  @@map("user_roles")
}
```

#### `modules`
```prisma
model Module {
  id          Int          @id @default(autoincrement())
  code        String       @unique   // "STUDENT_MANAGEMENT"
  name        String                 // "จัดการนักศึกษา"
  parentId    Int?                   // สำหรับ sub-module (level 2)
  level       Int          @default(1)
  sortOrder   Int?
  permissions Permission[]

  @@map("modules")
}
```

#### `permissions`
```prisma
model Permission {
  id          Int              @id @default(autoincrement())
  moduleId    Int
  method      String           // "view" | "create" | "edit" | "delete"
  code        String           @unique   // "STUDENT_MANAGEMENT.view"
  description String?
  module      Module           @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  roles       RolePermission[]

  @@unique([moduleId, method])
  @@map("permissions")
}
```

#### `role_permissions`
```prisma
model RolePermission {
  id           Int        @id @default(autoincrement())
  roleId       Int
  permissionId Int
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}
```

#### แก้ `User` model
```prisma
model User {
  // เดิม: role Role?  ← เก็บไว้ระหว่าง migration จากนั้น drop
  // เพิ่ม:
  userRoles UserRole[]
}
```

---

### 1.2 Modules และ Permissions ทั้งหมดในระบบ

| Module Code | ชื่อ | Methods |
|-------------|------|---------|
| `STUDENT_MANAGEMENT` | จัดการนักศึกษา | view, create, edit, delete |
| `ADVISOR_MANAGEMENT` | จัดการอาจารย์ที่ปรึกษา | view, create, edit, delete |
| `USER_MANAGEMENT` | จัดการผู้ใช้งาน | view, create, edit, delete |
| `REQUEST_MANAGEMENT` | จัดการคำร้อง | view, create, edit, delete |
| `DOCUMENT_MANAGEMENT` | จัดการเอกสาร | view, create, edit, delete |
| `TEMPLATE_MANAGEMENT` | จัดการเทมเพลตเอกสาร | view, create, edit, delete |
| `EMAIL_TEMPLATE_MANAGEMENT` | จัดการเทมเพลตอีเมล | view, create, edit, delete |
| `HEALTH_INSURANCE_MANAGEMENT` | จัดการประกันสุขภาพ | view, create, edit, delete |
| `VISA_MANAGEMENT` | จัดการวีซ่า | view, create, edit, delete |
| `PASSPORT_MANAGEMENT` | จัดการหนังสือเดินทาง | view, create, edit, delete |
| `GENERATED_DOC_MANAGEMENT` | ออกเอกสารสำหรับนักศึกษา | view, create, edit, delete |
| `INTERSERVICE_MANAGEMENT` | ตรวจสอบข้อมูลระหว่างหน่วยงาน | view, create, edit, delete |
| `NOTIFICATION_MANAGEMENT` | จัดการการแจ้งเตือน | view, create, edit, delete |
| `AUDIT_LOG` | ดูประวัติการใช้งาน | view |
| `ROLE_MANAGEMENT` | จัดการ Role และ Permission | view, create, edit, delete |

> **หมายเหตุ:** Permission code = `MODULE_CODE.method` เช่น `STUDENT_MANAGEMENT.view`

---

### 1.3 Seed ข้อมูลเริ่มต้น

**Roles:**
| code | name | หน้าที่หลัก |
|------|------|------------|
| `STUDENT` | นักศึกษา | ยื่นคำร้อง, ดูข้อมูลตัวเอง |
| `ADVISOR` | อาจารย์ที่ปรึกษา | ดูนักศึกษา, อนุมัติคำร้อง |
| `STAFF` | เจ้าหน้าที่ | จัดการนักศึกษา, คำร้อง, เอกสาร, user |
| `ADMIN` | ผู้ดูแลระบบ | กำหนด role และ permission ในระบบ |

**Default Permissions per Role:**

| Role | Permissions เริ่มต้น |
|------|---------------------|
| `STUDENT` | ไม่มี (ใช้ ownership check แทน) |
| `ADVISOR` | `REQUEST_MANAGEMENT.view`, `REQUEST_MANAGEMENT.edit`, `STUDENT_MANAGEMENT.view`, `INTERSERVICE_MANAGEMENT.view` |
| `STAFF` | ทุก permission ยกเว้น `ROLE_MANAGEMENT.*` |
| `ADMIN` | `ROLE_MANAGEMENT.*` เท่านั้น (view, create, edit, delete) |

**แนวทาง USER_MANAGEMENT:**
- `USER_MANAGEMENT.*` อยู่ใน **STAFF** — เพราะ STAFF เป็นผู้ใช้งานจริงในหน้า UI
- ADMIN ไม่มี `USER_MANAGEMENT` โดย default — ถ้าต้องการให้ admin คนไหนสร้าง user ได้ด้วย ให้ assign ทั้ง `ADMIN` + `STAFF` ให้ account นั้น (multi-role)

> ทุก role กำหนด permission แบบ explicit ทั้งหมดใน seed  
> หาก role ต้องการ permission ใหม่ที่เพิ่งสร้าง ต้อง assign ผ่านหน้า Role Management (ADMIN เท่านั้น)

---

### 1.4 Migration Strategy

```
1. สร้าง migration เพิ่ม 5 table ใหม่
2. Run seed: สร้าง roles, modules, permissions ทั้งหมด
3. Run migration script: แปลง User.role (enum) → UserRole records
4. ทดสอบ auth flow ใหม่
5. Drop User.role column (migration อีกรอบ)
```

**Migration script (ขั้นตอน 3):**
```typescript
// แปลง User.role เดิมไปเป็น UserRole
const users = await prisma.user.findMany({ where: { role: { not: null } } });
for (const user of users) {
  const role = await prisma.role.findUnique({ where: { code: user.role! } });
  if (role) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
}
```

---

## Phase 2 — Backend Core

### 2.1 แก้ Types (`backend/src/types/index.ts`)

```typescript
// เดิม
interface AuthPayload {
  userId: number;
  email: string;
  role: string;
}

// ใหม่
interface AuthPayload {
  userId: number;
  email: string;
  activeRole: string;        // role code ที่เลือกใช้งานอยู่ เช่น "STAFF"
  permissions: string[];     // ["STUDENT_MANAGEMENT.view", "REQUEST_MANAGEMENT.edit", ...]
                             // เสมอเป็น explicit list ทุก role
}
```

---

### 2.2 แก้ Auth Service (`backend/src/services/domain/auth.service.ts`)

**`login()` — เปลี่ยน return**
```typescript
// กรณี 1 role → return token ได้เลย (เหมือนเดิม)
// กรณีหลาย role → return requireRoleSelection
{
  requireRoleSelection: true,
  tempToken: "...",          // JWT อายุสั้น (5 นาที) ไม่มี permissions
  roles: [
    { id: 1, code: "STAFF", name: "เจ้าหน้าที่" },
    { id: 4, code: "ADVISOR", name: "อาจารย์ที่ปรึกษา" }
  ]
}
```

**`selectRole(userId, roleId)` — endpoint ใหม่**
```typescript
// ตรวจว่า user มี role นี้จริง
// ดึง permissions ของ role นั้น (explicit list เสมอ)
// สร้าง JWT ปกติที่มี activeRole + permissions
```

**`buildPermissions(roleId)` — helper**
```typescript
async function buildPermissions(roleId: number): Promise<string[]> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } }
  });
  return role?.permissions.map(rp => rp.permission.code) ?? [];
}
```

---

### 2.3 แก้ Auth Middleware (`backend/src/middleware/auth.middleware.ts`)

**`requireRole()` — ปรับให้ใช้ `activeRole`**
```typescript
export const requireRole = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.activeRole)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    next();
  };
```

**`requirePermission()` — ใหม่**
```typescript
export const requirePermission = (...permCodes: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const perms = req.user?.permissions ?? [];
    const hasAll = permCodes.every(code => perms.includes(code));
    if (!hasAll) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient permission' });
      return;
    }
    next();
  };
```

---

### 2.4 แก้ Auth Controller (`backend/src/controllers/auth.controller.ts`)

เพิ่ม endpoint:
```
POST /auth/select-role    ← เลือก role เมื่อมีหลาย role
GET  /auth/my-roles       ← ดู roles ทั้งหมดของตัวเอง
```

---

### 2.5 เพิ่ม Routes ใหม่สำหรับจัดการ Role/Permission

```
GET    /roles                         ← list roles ทั้งหมด
POST   /roles                         ← สร้าง role ใหม่
PUT    /roles/:id                     ← แก้ role
DELETE /roles/:id                     ← ลบ role

GET    /roles/:id/permissions         ← ดู permissions ของ role
PUT    /roles/:id/permissions         ← อัปเดต permissions ของ role (replace all)

GET    /modules                       ← list modules + permissions ทั้งหมด

GET    /users/:id/roles               ← ดู roles ของ user
POST   /users/:id/roles               ← assign role ให้ user
DELETE /users/:id/roles/:roleId       ← ถอน role จาก user
```

> ทุก route ข้างต้นต้องการ `authenticate + requirePermission('ROLE_MANAGEMENT.view/create/edit/delete')`

---

### 2.6 อัปเดต Permission Guard บน Routes ที่มีอยู่แล้ว

ตัวอย่างการเปลี่ยน:

```typescript
// เดิม
router.get('/students', authenticate, requireRole('STAFF', 'ADVISOR'), ...)

// ใหม่ (ใช้ permission แทน หรือควบคู่)
router.get('/students', authenticate, requirePermission('STUDENT_MANAGEMENT.view'), ...)
router.post('/students', authenticate, requirePermission('STUDENT_MANAGEMENT.create'), ...)
router.put('/students/:id', authenticate, requirePermission('STUDENT_MANAGEMENT.edit'), ...)
router.delete('/students/:id', authenticate, requirePermission('STUDENT_MANAGEMENT.delete'), ...)
```

**Route → Permission mapping:**

| Route File | Method | Permission ที่ต้องการ |
|-----------|--------|----------------------|
| `student.routes.ts` | GET /students | `STUDENT_MANAGEMENT.view` |
| `student.routes.ts` | POST /students | `STUDENT_MANAGEMENT.create` |
| `student.routes.ts` | PUT /students/:id | `STUDENT_MANAGEMENT.edit` |
| `advisor.routes.ts` | GET /advisors | `ADVISOR_MANAGEMENT.view` |
| `advisor.routes.ts` | POST /advisors | `ADVISOR_MANAGEMENT.create` |
| `request.routes.ts` | GET /requests | `REQUEST_MANAGEMENT.view` |
| `request.routes.ts` | PUT /requests/:id/status | `REQUEST_MANAGEMENT.edit` |
| `document.routes.ts` | GET /documents | `DOCUMENT_MANAGEMENT.view` |
| `template.routes.ts` | * | `TEMPLATE_MANAGEMENT.*` |
| `emailTemplate.routes.ts` | * | `EMAIL_TEMPLATE_MANAGEMENT.*` |
| `user.routes.ts` | * | `USER_MANAGEMENT.*` |
| `auditLog.routes.ts` | GET | `AUDIT_LOG.view` |
| `interservice.routes.ts` | * | `INTERSERVICE_MANAGEMENT.*` |
| `generatedDoc.routes.ts` | * | `GENERATED_DOC_MANAGEMENT.*` |
| `healthInsurance.routes.ts` | * | `HEALTH_INSURANCE_MANAGEMENT.*` |
| `visa.routes.ts` | * | `VISA_MANAGEMENT.*` |
| `passport.routes.ts` | * | `PASSPORT_MANAGEMENT.*` |

> **หมายเหตุ:** STUDENT route บางอัน เช่น `/students/me` และ `/students/register` ใช้ ownership check อยู่แล้ว ไม่ต้องเพิ่ม permission

---

## Phase 3 — Frontend

### 3.1 แก้ Auth Store (`frontend/src/lib/auth.ts`)

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  activeRole: string | null;           // role code ที่ใช้งานอยู่
  roles: { id: number; code: string; name: string }[];  // roles ทั้งหมดของ user
  permissions: string[];               // ["MODULE.method", ...] เสมอ (explicit)
  requireRoleSelection: boolean;       // true = ต้องให้ user เลือก role ก่อน
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  selectRole: (roleId: number) => Promise<void>;   // ใหม่
  hasPermission: (code: string) => boolean;        // ใหม่
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  fetchMe: () => Promise<void>;
}
```

**`hasPermission()` implementation:**
```typescript
hasPermission: (code: string) => {
  const { permissions } = get();
  return permissions.includes(code);
}
```

---

### 3.2 แก้ Frontend Middleware (`frontend/src/middleware.ts`)

```typescript
// เดิม — อ่าน role จาก cookie ist_role
// ใหม่ — อ่าน activeRole จาก cookie, เพิ่ม cookie ist_permissions (base64 encoded)

// Route protection ยังคงเหมือนเดิม แต่ใช้ activeRole แทน role
const ROLE_ROUTES: Record<string, string[]> = {
  STAFF:   ['/staff'],
  SUB_STAFF: ['/staff'],   // sub staff เข้าหน้าเดียวกัน แต่เห็น UI ต่างกัน
  ADVISOR: ['/advisor'],
  STUDENT: ['/student'],
};
```

---

### 3.3 หน้าใหม่: Role Selection Screen

**Path:** `frontend/src/app/auth/select-role/page.tsx`

แสดงเมื่อ login แล้ว `requireRoleSelection = true`

```
┌─────────────────────────────────┐
│     เลือกบทบาทที่ต้องการใช้งาน      │
├─────────────────────────────────┤
│  [ เจ้าหน้าที่ (STAFF) ]          │
│  [ อาจารย์ที่ปรึกษา (ADVISOR) ]    │
└─────────────────────────────────┘
```

Flow:
1. User คลิก role
2. Call `POST /auth/select-role { roleId }` พร้อม temp token
3. รับ JWT ปกติที่มี `activeRole` + `permissions`
4. เก็บใน store + redirect ตาม role

---

### 3.4 หน้าจัดการ Role & Permission (สำหรับ STAFF)

**Path:** `frontend/src/app/staff/roles/page.tsx`

ฟีเจอร์:
- List roles ทั้งหมด (สร้าง/แก้/ลบ)
- คลิก role → ดู permission matrix
- Permission matrix: แถว = Module, คอลัมน์ = view/create/edit/delete
- Checkbox toggle แต่ละ permission
- Save → PUT `/roles/:id/permissions`

```
┌─────────────────────────────────────────────────────────┐
│ Role: Sub Staff                                          │
├─────────────────────┬───────┬────────┬──────┬──────────┤
│ Module              │ view  │ create │ edit │  delete  │
├─────────────────────┼───────┼────────┼──────┼──────────┤
│ จัดการนักศึกษา      │  ✅   │   ✅   │  ✅  │    ❌    │
│ จัดการคำร้อง        │  ✅   │   ❌   │  ✅  │    ❌    │
│ ออกเอกสาร          │  ✅   │   ✅   │  ❌  │    ❌    │
│ จัดการผู้ใช้งาน     │  ❌   │   ❌   │  ❌  │    ❌    │
└─────────────────────┴───────┴────────┴──────┴──────────┘
```

---

### 3.5 `hasPermission()` ใน UI Components

```tsx
// ซ่อน/แสดง UI ตาม permission
const { hasPermission } = useAuthStore();

{hasPermission('STUDENT_MANAGEMENT.create') && (
  <Button onClick={handleCreate}>เพิ่มนักศึกษา</Button>
)}

{hasPermission('REQUEST_MANAGEMENT.edit') && (
  <Button onClick={handleApprove}>อนุมัติคำร้อง</Button>
)}
```

---

## ลำดับการทำงาน

```
Phase 1: Database
  ├─ [ ] แก้ schema.prisma (เพิ่ม 5 table)
  ├─ [ ] สร้าง migration
  ├─ [ ] แก้ seed.ts (roles, modules, permissions เริ่มต้น)
  └─ [ ] รัน migration script แปลง User.role → UserRole

Phase 2: Backend Core
  ├─ [ ] แก้ types/index.ts (AuthPayload)
  ├─ [ ] แก้ auth.service.ts (login + selectRole + buildPermissions)
  ├─ [ ] แก้ auth.middleware.ts (requireRole + requirePermission)
  ├─ [ ] แก้ auth.controller.ts (เพิ่ม select-role, my-roles)
  └─ [ ] สร้าง role.controller.ts + role.routes.ts

Phase 3: Route Updates
  └─ [ ] อัปเดต permission guard ทุก route file (19 files)

Phase 4: Frontend
  ├─ [ ] แก้ auth.ts (Zustand store)
  ├─ [ ] แก้ middleware.ts
  ├─ [ ] สร้างหน้า /auth/select-role
  └─ [ ] สร้างหน้า /staff/roles (Permission Management UI)
```

---

## ไฟล์ที่จะเปลี่ยน/สร้างใหม่

### Backend
| Action | ไฟล์ |
|--------|------|
| แก้ | `backend/prisma/schema.prisma` |
| แก้ | `backend/prisma/seed.ts` |
| สร้าง | `backend/prisma/migrations/..._add_permission_system/` |
| แก้ | `backend/src/types/index.ts` |
| แก้ | `backend/src/middleware/auth.middleware.ts` |
| แก้ | `backend/src/services/domain/auth.service.ts` |
| แก้ | `backend/src/controllers/auth.controller.ts` |
| สร้าง | `backend/src/controllers/role.controller.ts` |
| สร้าง | `backend/src/routes/role.routes.ts` |
| แก้ | `backend/src/routes/*.routes.ts` (19 files) |

### Frontend
| Action | ไฟล์ |
|--------|------|
| แก้ | `frontend/src/lib/auth.ts` |
| แก้ | `frontend/src/middleware.ts` |
| แก้ | `frontend/src/types/index.ts` |
| สร้าง | `frontend/src/app/auth/select-role/page.tsx` |
| สร้าง | `frontend/src/app/staff/roles/page.tsx` |

---

## สิ่งที่ยืมจากระบบ sook

| แนวคิด | sook | ระบบนี้ |
|--------|------|---------|
| Permission format | `MODULE_CODE.method` | `MODULE_CODE.method` ✅ |
| Admin bypass (wildcard) | `role_name == "Admin" → ["*"]` | ❌ ไม่ใช้ — ทุก role กำหนด explicit |
| Module hierarchy | level 1/2, parentId | level 1/2, parentId ✅ |
| Middleware pattern | `@verify_required` + `@decode_and_verify_permission_jwt` | `authenticate` + `requirePermission` ✅ |
| Multi-role | ❌ ไม่มี | ✅ เพิ่มใหม่ผ่าน UserRole table |
