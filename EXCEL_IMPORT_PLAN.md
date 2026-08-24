# Excel Import Plan — Teacher & Student Management

## ภาพรวม

Import ข้อมูลจาก Excel สำหรับ 2 กลุ่ม คือ **Advisor** และ **Student**  
Parse Excel ฝั่ง Frontend → ส่งเป็น JSON ไป Backend → ใช้ service เดิมที่มีอยู่แล้ว

---

## 1. Advisor Import (Teacher Management)

### Template columns

| email | titleEn | firstNameEn | lastNameEn | nationality | phone | faculty | isDean |
|-------|---------|-------------|------------|-------------|-------|---------|--------|
| john@kku.ac.th | Asst. Prof. | John | Smith | American | 0812345678 | Computing | N |

**หมายเหตุ:**
- `email` — required, ใช้สำหรับ Google login
- `firstNameEn`, `lastNameEn` — required
- `isDean` — Y/N หรือ TRUE/FALSE (ไม่บังคับ, default = N)
- `titleEn`, `nationality`, `phone`, `faculty` — optional

### สิ่งที่ต้องสร้าง

**Backend**
- `POST /advisors/import` — รับ `{ rows: [...] }` สร้าง Advisor + User ทีละ row, return summary ว่าแต่ละ row สำเร็จหรือ error อะไร
- เพิ่ม route ใน `advisor.routes.ts` (ใช้ `ADVISOR_MANAGEMENT.create` permission)

**Frontend**
- ปุ่ม "Import Excel" และ "Download Template" ใน `/staff/advisors/page.tsx`
- `ImportModal` component:
  1. อัพโหลดไฟล์ `.xlsx` / `.xls`
  2. Parse ด้วย `xlsx` library ใน browser → แสดง preview ทันที
  3. Validate แต่ละ row (email format, required fields) → highlight แถวที่มี error
  4. กด "Import" → ส่ง JSON ไป backend → แสดงผลลัพธ์

---

## 2. Student Import (Student Management)

### ข้อมูลที่ Import (minimal — นักศึกษากรอกเองผ่าน Phase 1)

| email | firstNameEn | middleNameEn | lastNameEn | studentId |
|-------|-------------|--------------|------------|-----------|
| student@email.com | Jane | — | Doe | 663xxxxxx |

**หมายเหตุ:**
- `email` — required
- `firstNameEn`, `lastNameEn` — required
- `middleNameEn`, `studentId` — optional
- **ไม่ต้องกรอกข้อมูลเต็ม** เพราะนักศึกษาจะกรอกเองใน Phase 1 Registration

### สิ่งที่ต้องสร้าง

**Backend**
- `POST /students/import` — รับ `{ rows: [...] }` สร้าง User + blank Student record ทีละ row (ใช้ `createStudent` service เดิม), return summary
- เพิ่ม route ใน `student.routes.ts` (ใช้ `STUDENT_MANAGEMENT.create` permission)

**Frontend**
- ปุ่ม "Import Excel" และ "Download Template" ใน `/staff/students/page.tsx`
- ใช้ `ImportModal` component เดียวกัน (config columns ต่างกัน)

---

## 3. ImportModal Component (shared)

**File:** `frontend/src/components/ImportModal.tsx`

```
[Download Template]    [เลือกไฟล์ Excel]

┌─────────────────────────────────────────────────┐
│ Preview (25 rows)  — 23 พร้อม  2 มี error       │
├────────┬───────────────┬───────────┬────────────┤
│ #      │ email         │ firstName │ สถานะ      │
├────────┼───────────────┼───────────┼────────────┤
│ 1      │ a@kku.ac.th   │ John      │ ✓ พร้อม    │
│ 2      │ (ว่าง)        │ Jane      │ ✗ ขาด email│
│ 3      │ b@kku.ac.th   │ Bob       │ ✓ พร้อม    │
└────────┴───────────────┴───────────┴────────────┘

           [ยกเลิก]  [Import 23 แถว →]
```

**Behavior:**
- แถวที่มี error → พื้นหลังแดงอ่อน, ไม่ถูก import
- แถวที่ OK → import ทั้งหมด (ไม่ skip)
- หลัง import เสร็จ → แสดง summary: "สำเร็จ 23 / ล้มเหลว 0"
- ถ้ามี error จาก backend (เช่น email ซ้ำ) → แสดงในตาราง result

---

## 4. Dependencies ที่ต้องติดตั้ง

| Package | ที่ไหน | วัตถุประสงค์ |
|---------|--------|-------------|
| `xlsx` | Frontend | Parse Excel + generate template |

Backend ไม่ต้องติดตั้งเพิ่ม เพราะรับข้อมูลเป็น JSON

---

## 5. ลำดับการ Implement

1. **Backend** — `importAdvisors` controller + route
2. **Backend** — `importStudents` controller + route
3. **Frontend** — ติดตั้ง `xlsx`
4. **Frontend** — สร้าง `ImportModal` component
5. **Frontend** — เพิ่มปุ่ม Import + Template ใน `/staff/advisors/page.tsx`
6. **Frontend** — เพิ่มปุ่ม Import + Template ใน `/staff/students/page.tsx`

---

## 6. Flow สรุป

```
Staff กด "Download Template"
→ ดาวน์โหลด Excel template พร้อม header row

Staff กรอกข้อมูลใน Excel → อัพโหลด
→ Frontend parse → แสดง preview ทันที (ไม่มี network)
→ Validate: email format, required fields

Staff ตรวจสอบ preview → กด "Import"
→ ส่ง JSON ไป backend
→ Backend สร้าง account ทีละ row

Backend return summary
→ Frontend แสดง: สำเร็จ X แถว / ล้มเหลว Y แถว (พร้อมเหตุผล)
→ ปิด modal → refresh รายการ
```
