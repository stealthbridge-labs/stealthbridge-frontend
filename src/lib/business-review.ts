/**
 * Business maker-checker policy calculator for offline previews.
 * All subjects/roles are untrusted inputs here. This does NOT verify signatures,
 * membership, organization identity, private proofs or authorize money movement.
 */
export type BusinessReviewRole = "owner" | "admin" | "operator" | "approver" | "viewer";
export interface BusinessReviewPolicy {
  organization: string;
  initiator: string;
  intentSha256: string;
  requiredReviewers: number;
  issuedAtUnix: number;
  expiresAtUnix: number;
}
export interface BusinessReviewRecord {
  organization: string;
  reviewer: string;
  role: BusinessReviewRole;
  recordedAtUnix: number;
}
export interface BusinessReviewResult {
  distinctReviewers: number;
  remainingReviewers: number;
  reviewCountMet: boolean;
  financialExecutionAuthorized: false;
}
export type BusinessReviewErrorCode =
  "INVALID_POLICY" | "EXPIRED" | "INVALID_RECORD" | "WRONG_ORGANIZATION" |
  "SAME_INITIATOR" | "FORBIDDEN_ROLE" | "DUPLICATE_REVIEWER" | "TOO_MANY_RECORDS";
export class BusinessReviewError extends Error {
  constructor(public readonly code: BusinessReviewErrorCode) {
    super("StealthBridge business review policy rejected: "+code);
    this.name="BusinessReviewError";
  }
}
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const DIGEST=/^[a-f0-9]{64}$/i;
const SUBJECT=/^[A-Za-z0-9]{8,128}$/;
const MAX_WINDOW=86_400;
const MAX_RECORDS=8;
/** Returns a review *count* only; downstream signing and settlement must be separate. */
export function assessBusinessReview(
  policy: BusinessReviewPolicy,
  records: readonly BusinessReviewRecord[],
  nowUnix: number,
): BusinessReviewResult {
  if(!UUID.test(policy.organization)||policy.organization==="00000000-0000-0000-0000-000000000000"||
    !SUBJECT.test(policy.initiator)||!DIGEST.test(policy.intentSha256)||
    /^0{64}$/.test(policy.intentSha256)||
    !Number.isSafeInteger(policy.requiredReviewers)||policy.requiredReviewers<2||
    policy.requiredReviewers>4||
    !Number.isSafeInteger(policy.issuedAtUnix)||policy.issuedAtUnix<=0||
    !Number.isSafeInteger(policy.expiresAtUnix)||
    policy.expiresAtUnix<=policy.issuedAtUnix||
    policy.expiresAtUnix-policy.issuedAtUnix>MAX_WINDOW)
   throw new BusinessReviewError("INVALID_POLICY");
  if(!Number.isSafeInteger(nowUnix)||nowUnix<policy.issuedAtUnix||
    nowUnix>=policy.expiresAtUnix)throw new BusinessReviewError("EXPIRED");
  if(records.length>MAX_RECORDS)throw new BusinessReviewError("TOO_MANY_RECORDS");
  const reviewers=new Set<string>();
  for(const entry of records){
    if(entry.organization!==policy.organization)
      throw new BusinessReviewError("WRONG_ORGANIZATION");
    if(!SUBJECT.test(entry.reviewer)||!Number.isSafeInteger(entry.recordedAtUnix)||
      entry.recordedAtUnix<policy.issuedAtUnix||entry.recordedAtUnix>nowUnix)
      throw new BusinessReviewError("INVALID_RECORD");
    if(entry.reviewer===policy.initiator)
      throw new BusinessReviewError("SAME_INITIATOR");
    if(!["owner","admin","approver"].includes(entry.role))
      throw new BusinessReviewError("FORBIDDEN_ROLE");
    if(reviewers.has(entry.reviewer))
      throw new BusinessReviewError("DUPLICATE_REVIEWER");
    reviewers.add(entry.reviewer);
  }
  return {
    distinctReviewers:reviewers.size,
    remainingReviewers:Math.max(policy.requiredReviewers-reviewers.size,0),
    reviewCountMet:reviewers.size>=policy.requiredReviewers,
    financialExecutionAuthorized:false,
  };
}
