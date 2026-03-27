import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult } from 'express-validator';
import { body } from 'express-validator';

/** Wrap a ValidationChain[] so invalid requests get a 400 automatically */
export function validate(schema: ValidationChain[]) {
  return [
    ...schema,
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }
      next();
    },
  ];
}

/* ── Reusable schemas ─────────────────────────────────────────── */

export const createStudentSchema = validate([
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('studentId').optional().matches(/^\d{9}-\d$/).withMessage('studentId must be in format XXXXXXXXX-X (e.g. 663380395-4)'),
  body('firstNameEn').notEmpty().withMessage('firstNameEn is required'),
  body('lastNameEn').notEmpty().withMessage('lastNameEn is required'),
]);

export const createVisaSchema = validate([
  body('visaType').notEmpty().withMessage('visaType is required'),
  body('issuingCountry').notEmpty().withMessage('issuingCountry is required'),
  body('issueDate').isISO8601().withMessage('issueDate must be a valid date'),
  body('expiryDate').isISO8601().withMessage('expiryDate must be a valid date'),
  body('expiryDate').custom((expiry, { req }) => {
    if (new Date(expiry) <= new Date(req.body.issueDate)) {
      throw new Error('expiryDate must be after issueDate');
    }
    return true;
  }),
]);

export const createPassportSchema = validate([
  body('passportNumber').notEmpty().withMessage('passportNumber is required'),
  body('issuingCountry').notEmpty().withMessage('issuingCountry is required'),
  body('issueDate').isISO8601().withMessage('issueDate must be a valid date'),
  body('expiryDate').isISO8601().withMessage('expiryDate must be a valid date'),
  body('expiryDate').custom((expiry, { req }) => {
    if (new Date(expiry) <= new Date(req.body.issueDate)) {
      throw new Error('expiryDate must be after issueDate');
    }
    return true;
  }),
]);

export const updateRequestStatusSchema = validate([
  body('status').isIn([
    'PENDING', 'FORWARDED_TO_ADVISOR', 'ADVISOR_APPROVED', 'ADVISOR_REJECTED',
    'STAFF_APPROVED', 'STAFF_REJECTED', 'FORWARDED_TO_DEAN', 'DEAN_APPROVED',
    'DEAN_REJECTED', 'CANCELLED',
  ]).withMessage('Invalid status value'),
]);

export const createUserSchema = validate([
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').notEmpty().withMessage('name is required'),
  body('role').isIn(['STUDENT', 'ADVISOR', 'STAFF']).withMessage('Invalid role'),
]);
