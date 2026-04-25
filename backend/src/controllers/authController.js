import { body } from 'express-validator';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { sendEmail } from '../config/mailer.js';
import { signAuthToken } from '../utils/jwt.js';
import { comparePassword, generateNumericCode, generateTokenValue, hashPassword, hashToken } from '../utils/security.js';
import { logAction } from '../utils/audit.js';

async function createAndSendVerificationCode(user) {
  const rawCode = generateNumericCode(6);
  const hashedCode = hashToken(rawCode);

  await query('UPDATE email_verification_codes SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
  await query(
    `INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
    [user.id, hashedCode, env.emailVerificationCodeExpiresMinutes]
  );

  let sent = false;
  try {
    sent = await sendEmail({
      to: user.email,
      subject: 'UniVault email verification code',
      text: `Codul tau de verificare este: ${rawCode}. Codul expira in ${env.emailVerificationCodeExpiresMinutes} minute.`,
      category: 'Email Verification'
    });
  } catch (error) {
    console.error('Email provider error (email verification):', error.message);
  }

  return {
    sent,
    developmentVerificationCode: sent ? undefined : rawCode
  };
}

export const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('email').trim().isEmail(),
  body('password').isLength({ min: 8 }),
  body('confirmPassword').custom((value, { req }) => value === req.body.password)
];

export async function register(req, res) {
  const { name, email, password } = req.body;

  const { rows: existingRows } = await query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
  if (existingRows.length) {
    if (existingRows[0].email_verified) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    return res.status(409).json({
      message: 'Acest email este deja inregistrat, dar nu a fost inca verificat. Foloseste verificarea codului sau cere retrimiterea lui.',
      requiresEmailVerification: true,
      email
    });
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role, email_verified)
     VALUES ($1, $2, $3, 'student', FALSE)
     RETURNING id, name, email, role, email_verified`,
    [name, email, passwordHash]
  );

  const user = rows[0];
  const verification = await createAndSendVerificationCode(user);

  await logAction({
    user,
    actionType: 'register',
    actionDetails: `User ${user.email} registered`,
    ipAddress: req.ip
  });

  return res.status(201).json({
    message: 'Cont creat. Introdu codul primit pe email pentru a finaliza inregistrarea.',
    requiresEmailVerification: true,
    email: user.email,
    developmentVerificationCode: verification.developmentVerificationCode
  });
}

export const loginValidation = [
  body('email').trim().isEmail(),
  body('password').isLength({ min: 1 })
];

export async function login(req, res) {
  const { email, password } = req.body;

  const { rows } = await query(
    'SELECT id, name, email, role, password_hash, is_active, email_verified FROM users WHERE email = $1',
    [email]
  );

  if (!rows.length) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const user = rows[0];
  if (!user.is_active) {
    return res.status(403).json({ message: 'Account is deactivated.' });
  }

  if (!user.email_verified) {
    return res.status(403).json({
      message: 'Emailul nu a fost verificat. Verifica adresa de email si introdu codul primit.',
      requiresEmailVerification: true,
      email: user.email
    });
  }

  const passwordOk = await comparePassword(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = signAuthToken(user);

  await logAction({
    user,
    actionType: 'login',
    actionDetails: `User ${user.email} logged in`,
    ipAddress: req.ip
  });

  return res.json({
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}

export const verifyEmailValidation = [
  body('email').trim().isEmail(),
  body('code').trim().isLength({ min: 6, max: 6 }).isNumeric()
];

export async function verifyEmail(req, res) {
  const { email, code } = req.body;
  const codeHash = hashToken(code);

  const { rows: userRows } = await query(
    'SELECT id, name, email, role, email_verified FROM users WHERE email = $1',
    [email]
  );

  if (!userRows.length) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const user = userRows[0];
  if (user.email_verified) {
    const token = signAuthToken(user);
    return res.json({
      message: 'Emailul este deja verificat.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  }

  const { rows: codeRows } = await query(
    `SELECT id
     FROM email_verification_codes
     WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id, codeHash]
  );

  if (!codeRows.length) {
    return res.status(400).json({ message: 'Codul de verificare este invalid sau a expirat.' });
  }

  await query('UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1', [user.id]);
  await query('UPDATE email_verification_codes SET used_at = NOW() WHERE id = $1', [codeRows[0].id]);

  const token = signAuthToken(user);

  await logAction({
    user,
    actionType: 'email_verified',
    actionDetails: `Email verified for ${user.email}`,
    ipAddress: req.ip
  });

  return res.json({
    message: 'Email verificat cu succes.',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}

export const resendVerificationCodeValidation = [body('email').trim().isEmail()];

export async function resendVerificationCode(req, res) {
  const { email } = req.body;

  const { rows } = await query(
    'SELECT id, name, email, role, email_verified FROM users WHERE email = $1',
    [email]
  );

  if (!rows.length) {
    return res.json({ message: 'Daca emailul exista, un nou cod a fost trimis.' });
  }

  const user = rows[0];
  if (user.email_verified) {
    return res.json({ message: 'Acest email este deja verificat.' });
  }

  const verification = await createAndSendVerificationCode(user);

  await logAction({
    user,
    actionType: 'email_verification_resent',
    actionDetails: `Verification code resent to ${user.email}`,
    ipAddress: req.ip
  });

  return res.json({
    message: 'Un nou cod de verificare a fost trimis.',
    developmentVerificationCode: verification.developmentVerificationCode
  });
}

export async function me(req, res) {
  return res.json({ user: req.user });
}

export async function logout(req, res) {
  await logAction({
    user: req.user,
    actionType: 'logout',
    actionDetails: `User ${req.user.email} logged out`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Logout logged. Remove token client-side.' });
}

export const forgotPasswordValidation = [body('email').trim().isEmail()];

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const { rows } = await query('SELECT id, email, role FROM users WHERE email = $1', [email]);

  if (!rows.length) {
    return res.json({ message: 'If the email exists, a reset link was sent.' });
  }

  const user = rows[0];
  const rawToken = generateTokenValue();
  const hashed = hashToken(rawToken);

  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
    [user.id, hashed, env.resetTokenExpiresMinutes]
  );

  const resetUrl = `${env.frontendUrl}/reset-password?token=${rawToken}`;
  let sent = false;

  try {
    sent = await sendEmail({
      to: user.email,
      subject: 'UniVault password reset',
      text: `Reset your password using this link (valid 1 hour): ${resetUrl}`,
      category: 'Password Reset'
    });
  } catch (error) {
    // Keep auth flow functional even when external email provider fails.
    console.error('Email provider error (forgot password):', error.message);
  }

  await logAction({
    user,
    actionType: 'password_reset_requested',
    actionDetails: `Password reset requested for ${user.email}`,
    ipAddress: req.ip
  });

  return res.json({
    message: 'If the email exists, a reset link was sent.',
    developmentResetUrl: sent ? undefined : resetUrl
  });
}

export const resetPasswordValidation = [
  body('token').isLength({ min: 10 }),
  body('newPassword').isLength({ min: 8 })
];

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  const tokenHash = hashToken(token);

  const { rows } = await query(
    `SELECT prt.id, prt.user_id, u.email, u.role
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()
     ORDER BY prt.created_at DESC
     LIMIT 1`,
    [tokenHash]
  );

  if (!rows.length) {
    return res.status(400).json({ message: 'Reset token invalid or expired.' });
  }

  const record = rows[0];
  const passwordHash = await hashPassword(newPassword);

  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, record.user_id]);
  await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [record.id]);

  await logAction({
    user: { id: record.user_id, email: record.email, role: record.role },
    actionType: 'password_reset_completed',
    actionDetails: `Password reset completed for ${record.email}`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Password reset successful.' });
}
