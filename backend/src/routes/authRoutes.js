import { Router } from 'express';
import {
  forgotPassword,
  forgotPasswordValidation,
  login,
  loginValidation,
  logout,
  me,
  register,
  registerValidation,
  resendVerificationCode,
  resendVerificationCodeValidation,
  resetPassword,
  resetPasswordValidation,
  verifyEmail,
  verifyEmailValidation
} from '../controllers/authController.js';
import { validateRequest } from '../middleware/validate.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.post('/register', registerValidation, validateRequest, asyncHandler(register));
router.post('/login', loginValidation, validateRequest, asyncHandler(login));
router.post('/verify-email', verifyEmailValidation, validateRequest, asyncHandler(verifyEmail));
router.post(
  '/resend-verification-code',
  resendVerificationCodeValidation,
  validateRequest,
  asyncHandler(resendVerificationCode)
);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, asyncHandler(forgotPassword));
router.post('/reset-password', resetPasswordValidation, validateRequest, asyncHandler(resetPassword));
router.get('/me', authRequired, asyncHandler(me));
router.post('/logout', authRequired, asyncHandler(logout));

export default router;
