export const config = {
  bucket: process.env.GCS_BUCKET ?? 'rollingblackoutband',
  prefix: process.env.GCS_PREFIX ?? '2026/',
  projectId: process.env.GCP_PROJECT_ID,
  notifyEmails: (process.env.NOTIFY_EMAILS ?? '').split(',').filter(Boolean),
  chatWebhook: process.env.GOOGLE_CHAT_WEBHOOK_URL ?? '',
  useMock: process.env.USE_MOCK === 'true',
};
