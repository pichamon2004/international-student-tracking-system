// For "digital" and "manual" templates the approver's signature is part of
// approving: Approve opens the signing dialog and only records the approval
// once they've signed. ("approval" templates print the name server-side.)
export function needsSignatureToApprove(opts: {
  hasDoc: boolean;
  signingMethod?: string;
  requiredRoles: string[];
  signatures: { role: string }[];
  myRole: string;
}): boolean {
  const { hasDoc, signingMethod = 'digital', requiredRoles, signatures, myRole } = opts;
  if (!hasDoc) return false;
  if (signingMethod !== 'digital' && signingMethod !== 'manual') return false;
  if (!requiredRoles.includes(myRole)) return false;
  return !signatures.some(s => s.role === myRole);
}
