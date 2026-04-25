import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendUrls: (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  resetTokenExpiresMinutes: Number(process.env.RESET_TOKEN_EXPIRES_MINUTES || 60),
  emailVerificationCodeExpiresMinutes: Number(process.env.EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES || 10),
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || 'noreply@univault.local',
  mailtrapApiToken: process.env.MAILTRAP_API_TOKEN,
  mailtrapApiUrl: process.env.MAILTRAP_API_URL || 'https://send.api.mailtrap.io/api/send',
  mailtrapFromEmail: process.env.MAILTRAP_FROM_EMAIL,
  mailtrapFromName: process.env.MAILTRAP_FROM_NAME || 'UniVault'
};

if (!env.databaseUrl) {
  throw new Error('Missing DATABASE_URL in environment.');
}
