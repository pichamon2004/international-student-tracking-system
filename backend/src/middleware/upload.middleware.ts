import multer from 'multer';

// ── All uploads use memory storage — files go to R2, not local disk ──────────
const storage = multer.memoryStorage();

// ─── File filters ─────────────────────────────────────────────────────────────
const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /^image\/(jpeg|jpg|png|webp)$/;
  if (allowed.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
};

const pdfFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'));
};

const anyFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /^(image\/(jpeg|jpg|png|webp)|application\/pdf)$/;
  if (allowed.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only images (JPEG, PNG, WebP) and PDF files are allowed'));
};

// ─── Multer instances ─────────────────────────────────────────────────────────
/** รูปภาพเท่านั้น — จำกัด 5 MB */
export const uploadImage = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/** รูปภาพสำหรับ scan/OCR — จำกัด 20 MB (passport photos อาจใหญ่กว่า) */
export const uploadImageLarge = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 20 * 1024 * 1024 } });

/** PDF เท่านั้น — จำกัด 20 MB */
export const uploadPdf = multer({ storage, fileFilter: pdfFilter, limits: { fileSize: 20 * 1024 * 1024 } });

/** รูปภาพ หรือ PDF — จำกัด 10 MB (ใช้เป็น default ทั่วไป) */
export const upload = multer({ storage, fileFilter: anyFilter, limits: { fileSize: 10 * 1024 * 1024 } });
