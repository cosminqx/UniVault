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
  resetPassword,
  resetPasswordValidation
} from '../controllers/authController.js';
import { validateRequest } from '../middleware/validate.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validateRequest, resetPassword);
router.get('/me', authRequired, me);
router.post('/logout', authRequired, logout);

export default router;
