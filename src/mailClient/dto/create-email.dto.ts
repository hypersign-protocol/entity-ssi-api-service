export type SendMailJob = {
  to: string;
  subject: string;
  message: any;
  cc?: string[];
  bcc?: string[];
};

export type CreditUsageNotificationJob = {
  serviceId: string;
  totalCredits: number;
  usedCredits: number;
  usedPercentage: number;
  threshold: number;
  expiresAt?: string;
};
