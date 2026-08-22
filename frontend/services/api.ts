import { Session } from 'next-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Attaches user identity headers from active NextAuth session for backend validation & sync.
 */
function getHeaders(session: Session | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.user) {
    const user = session.user as any;
    if (user.id) headers['x-user-id'] = user.id;
    if (user.email) headers['x-user-email'] = user.email;
    if (user.name) headers['x-user-name'] = user.name;
    if (user.image) headers['x-user-avatar'] = user.image;
  }

  return headers;
}

export interface CreateCampaignParams {
  subject: string;
  body: string;
  startTime: string; // ISO Date String
  delaySeconds: number;
  hourlyLimit: number;
  recipients: string[];
}

export interface EmailRecord {
  id: string;
  campaignId: string;
  recipient: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'RATE_LIMITED' | 'SENT' | 'FAILED';
  attempts: number;
  sentAt?: string | null;
  errorMessage?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: {
    subject: string;
    startTime: string;
  };
}

export async function createCampaign(
  params: CreateCampaignParams,
  session: Session | null
): Promise<{ message: string; campaign: any }> {
  const res = await fetch(`${API_URL}/api/campaigns`, {
    method: 'POST',
    headers: getHeaders(session),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create campaign' }));
    throw new Error(err.message || 'Failed to create campaign');
  }

  return res.json();
}

export async function fetchScheduledEmails(session: Session | null): Promise<EmailRecord[]> {
  const res = await fetch(`${API_URL}/api/emails/scheduled`, {
    method: 'GET',
    headers: getHeaders(session),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch scheduled emails');
  }

  return res.json();
}

export async function fetchSentEmails(session: Session | null): Promise<EmailRecord[]> {
  const res = await fetch(`${API_URL}/api/emails/sent`, {
    method: 'GET',
    headers: getHeaders(session),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch sent emails');
  }

  return res.json();
}
