export enum RSVPStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum RSVPStatusLabel {
  CONFIRMED = '已报名',
  CANCELLED = '已取消',
}

export const RSVP_STATUS_STYLES: Record<
  RSVPStatus,
  { backgroundColor: string; color: string }
> = {
  [RSVPStatus.CONFIRMED]: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    color: '#4caf50',
  },
  [RSVPStatus.CANCELLED]: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    color: '#f44336',
  },
};

export function getRSVPStatusLabel(status: RSVPStatus | string): string {
  debugger;
  const statusMap: Record<string, string> = {
    [RSVPStatus.CONFIRMED]: RSVPStatusLabel.CONFIRMED,
    [RSVPStatus.CANCELLED]: RSVPStatusLabel.CANCELLED,
  };
  return statusMap[status] || status;
}

export function getRSVPStatusStyle(status: RSVPStatus | string): {
  backgroundColor: string;
  color: string;
} {
  const styleMap: Record<string, { backgroundColor: string; color: string }> = {
    [RSVPStatus.CONFIRMED]: RSVP_STATUS_STYLES[RSVPStatus.CONFIRMED],
    [RSVPStatus.CANCELLED]: RSVP_STATUS_STYLES[RSVPStatus.CANCELLED],
  };
  return styleMap[status] || RSVP_STATUS_STYLES[RSVPStatus.CONFIRMED];
}

export enum ApprovalStatus {
  AUTO = 'auto',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ApprovalStatusLabel {
  AUTO = '自动通过',
  PENDING = '待处理',
  APPROVED = '已审批',
  REJECTED = '已拒绝',
}

export const APPROVAL_STATUS_STYLES: Record<
  ApprovalStatus,
  { backgroundColor: string; color: string }
> = {
  [ApprovalStatus.AUTO]: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    color: '#4caf50',
  },
  [ApprovalStatus.PENDING]: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    color: '#f59e0b',
  },
  [ApprovalStatus.APPROVED]: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    color: '#4caf50',
  },
  [ApprovalStatus.REJECTED]: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    color: '#f44336',
  },
};

export function getApprovalStatusLabel(
  status: ApprovalStatus | string
): string {
  const statusMap: Record<string, string> = {
    [ApprovalStatus.AUTO]: ApprovalStatusLabel.AUTO,
    [ApprovalStatus.PENDING]: ApprovalStatusLabel.PENDING,
    [ApprovalStatus.APPROVED]: ApprovalStatusLabel.APPROVED,
    [ApprovalStatus.REJECTED]: ApprovalStatusLabel.REJECTED,
  };
  return statusMap[status] || status;
}

export function getApprovalStatusStyle(status: ApprovalStatus | string): {
  backgroundColor: string;
  color: string;
} {
  const styleMap: Record<string, { backgroundColor: string; color: string }> = {
    [ApprovalStatus.PENDING]: APPROVAL_STATUS_STYLES[ApprovalStatus.PENDING],
    [ApprovalStatus.APPROVED]: APPROVAL_STATUS_STYLES[ApprovalStatus.APPROVED],
    [ApprovalStatus.REJECTED]: APPROVAL_STATUS_STYLES[ApprovalStatus.REJECTED],
  };
  return styleMap[status] || APPROVAL_STATUS_STYLES[ApprovalStatus.PENDING];
}
