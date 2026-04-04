export const STATUS = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  AWAITING_GUARANTOR: "AWAITING_GUARANTOR",
  GUARANTEED: "GUARANTEED",
  FINAL_REVIEW: "FINAL_REVIEW",
  APPROVED: "APPROVED",
  FUNDED: "FUNDED",
  COLLECTED: "COLLECTED",
  REJECTED_GUARANTOR: "REJECTED_GUARANTOR"
};

export const BADGE_LABEL = {
  [STATUS.PENDING]: "Pending",
  [STATUS.UNDER_REVIEW]: "Under Review",
  [STATUS.AWAITING_GUARANTOR]: "Pending",
  [STATUS.GUARANTEED]: "Guaranteed",
  [STATUS.FINAL_REVIEW]: "Under Review",
  [STATUS.APPROVED]: "Approved",
  [STATUS.FUNDED]: "Funded",
  [STATUS.COLLECTED]: "Funded",
  [STATUS.REJECTED_GUARANTOR]: "Pending"
};

export function nextId() {
  return `lw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
