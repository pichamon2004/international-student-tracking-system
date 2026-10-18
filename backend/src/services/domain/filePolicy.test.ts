// Run with: npm run test:file-policy
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FilePurpose } from '@prisma/client';
import { PURPOSE_POLICY, SLOT_POLICY, canClaim, mimeAllowed, type ClaimableFile, type ClaimActor, type FileSlot } from './filePolicy';

const MB = 1024 * 1024;
const ALL_PURPOSES = Object.values(FilePurpose);
const ALL_SLOTS = Object.keys(SLOT_POLICY) as FileSlot[];

const file = (over: Partial<ClaimableFile> = {}): ClaimableFile => ({
  purpose: 'PASSPORT_IMAGE', ownerStudentId: 1, ownerUserId: null,
  legacyUnowned: false, deletedAt: null, mimeType: 'image/png', ...over,
});
const student = (studentId: number): ClaimActor => ({ userId: 100 + studentId, activeRole: 'STUDENT', permissions: [], studentId });
const staff = (permissions: string[]): ClaimActor => ({ userId: 900, activeRole: 'STAFF', permissions });

test('every purpose has a policy within the 20 MB ceiling', () => {
  for (const p of ALL_PURPOSES) {
    assert.ok(PURPOSE_POLICY[p], `missing policy for ${p}`);
    assert.ok(PURPOSE_POLICY[p].maxBytes > 0 && PURPOSE_POLICY[p].maxBytes <= 20 * MB, `${p} maxBytes out of range`);
  }
});

test('every slot only accepts purposes of its own owner scope', () => {
  for (const slot of ALL_SLOTS) {
    for (const p of SLOT_POLICY[slot].accepts) {
      assert.equal(PURPOSE_POLICY[p].scope, SLOT_POLICY[slot].scope, `${slot} accepts ${p} of another scope`);
    }
  }
});

test('image slots never accept PDF purposes and vice versa', () => {
  assert.equal(mimeAllowed('SIGNATURE', 'application/pdf'), false);
  assert.equal(mimeAllowed('GENERATED_PDF', 'image/png'), false);
  assert.equal(canClaim(file({ purpose: 'VISA_IMAGE', mimeType: 'application/pdf' }), 'visa.image', { kind: 'student', studentId: 1 }, student(1)), false);
});

test('visa.passportPage accepts the passport photo of the same student only', () => {
  const pp = file({ purpose: 'PASSPORT_IMAGE', ownerStudentId: 1 });
  assert.equal(canClaim(pp, 'visa.passportPage', { kind: 'student', studentId: 1 }, student(1)), true);
  // Student A's passport photo on student B's visa
  assert.equal(canClaim(pp, 'visa.passportPage', { kind: 'student', studentId: 2 }, student(2)), false);
  assert.equal(canClaim(pp, 'visa.passportPage', { kind: 'student', studentId: 2 }, staff(['VISA_MANAGEMENT.edit'])), false);
});

test('purposes cannot cross slots even for the uploader', () => {
  // A signature (user scope) cannot become a passport image — the slot rejects the target kind first
  assert.throws(() => canClaim(file({ purpose: 'SIGNATURE', ownerStudentId: null, ownerUserId: 900 }), 'passport.image', { kind: 'user', userId: 900 }, staff([])));
  assert.equal(canClaim(file({ purpose: 'SIGNATURE', ownerStudentId: null, ownerUserId: 900 }), 'passport.image', { kind: 'student', studentId: 1 }, staff(['PASSPORT_MANAGEMENT.edit'])), false);
  assert.equal(canClaim(file({ purpose: 'PASSPORT_IMAGE', ownerStudentId: null, ownerUserId: 900 }), 'docSignature.image', { kind: 'user', userId: 900 }, staff([])), false);
  assert.equal(canClaim(file({ purpose: 'VISA_ARRIVAL_STAMP' }), 'passport.image', { kind: 'student', studentId: 1 }, student(1)), false);
  assert.equal(canClaim(file({ purpose: 'DEPENDENT_ARRIVAL_STAMP' }), 'dependent.passportImage', { kind: 'student', studentId: 1 }, student(1)), false);
});

test('owner scope must match exactly', () => {
  assert.equal(canClaim(file({ ownerStudentId: 2 }), 'passport.image', { kind: 'student', studentId: 1 }, student(1)), false);
  // both owners set (the DB CHECK forbids it, the policy must too)
  assert.equal(canClaim(file({ ownerStudentId: 1, ownerUserId: 5 }), 'passport.image', { kind: 'student', studentId: 1 }, student(1)), false);
});

test('soft-deleted and legacy-unowned files are never claimable', () => {
  assert.equal(canClaim(file({ deletedAt: new Date() }), 'passport.image', { kind: 'student', studentId: 1 }, student(1)), false);
  assert.equal(canClaim(file({ legacyUnowned: true, ownerStudentId: null }), 'passport.image', { kind: 'student', studentId: 1 }, staff(['PASSPORT_MANAGEMENT.edit'])), false);
  assert.equal(canClaim(null, 'passport.image', { kind: 'student', studentId: 1 }, student(1)), false);
});

test('a non-uploader staff member needs the slot permission', () => {
  const f = file({ purpose: 'VISA_IMAGE', ownerStudentId: 7 });
  assert.equal(canClaim(f, 'visa.image', { kind: 'student', studentId: 7 }, staff(['VISA_MANAGEMENT.edit'])), true);
  assert.equal(canClaim(f, 'visa.image', { kind: 'student', studentId: 7 }, staff(['VISA_MANAGEMENT.view'])), false);
  assert.equal(canClaim(f, 'visa.image', { kind: 'student', studentId: 7 }, { userId: 50, activeRole: 'ADVISOR', permissions: ['STUDENT_MANAGEMENT.view'] }), false);
});

test('a student can only attach to their own records', () => {
  const f = file({ purpose: 'VISA_IMAGE', ownerStudentId: 1 });
  assert.equal(canClaim(f, 'visa.image', { kind: 'student', studentId: 1 }, student(2)), false);
});

test('signatures belong to the signer', () => {
  const sig = file({ purpose: 'SIGNATURE', ownerStudentId: null, ownerUserId: 42 });
  assert.equal(canClaim(sig, 'docSignature.image', { kind: 'user', userId: 42 }, { userId: 42, activeRole: 'ADVISOR', permissions: [] }), true);
  assert.equal(canClaim(sig, 'docSignature.image', { kind: 'user', userId: 43 }, { userId: 43, activeRole: 'ADVISOR', permissions: [] }), false);
});
