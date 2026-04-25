import nodemailer from 'nodemailer';
import fetch from 'node-fetch';
import { env } from './env.js';

let transporter = null;

export function getMailer() {
  if (transporter) {
    return transporter;
  }

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  return transporter;
}

function hasMailtrapApiConfig() {
  return Boolean(env.mailtrapApiToken);
}

export function hasEmailProvider() {
  return hasMailtrapApiConfig() || Boolean(getMailer());
}

export async function sendEmail({ to, subject, text, html, fromEmail, fromName, category = 'UniVault' }) {
  const recipients = Array.isArray(to) ? to : [to];

  if (!recipients.length) {
    return false;
  }

  if (hasMailtrapApiConfig()) {
    const payload = {
      from: {
        email: fromEmail || env.mailtrapFromEmail || env.smtpFrom,
        name: fromName || env.mailtrapFromName || 'UniVault'
      },
      to: recipients.map((email) => ({ email })),
      subject,
      text,
      category
    };

    if (html) {
      payload.html = html;
    }

    const response = await fetch(env.mailtrapApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.mailtrapApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Mailtrap API error: ${response.status} ${body}`);
    }

    return true;
  }

  const mailer = getMailer();
  if (!mailer) {
    return false;
  }

  await mailer.sendMail({
    from: fromEmail || env.smtpFrom,
    to: recipients.join(','),
    subject,
    text,
    html
  });

  return true;
}
