import { Router } from 'express';
import { login, logout, getSession } from '../controllers/auth.controllers';
import { loginSchema, logoutSchema } from '../schemas/auth.schemas';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// Route de connexion
router.post(
  '/login',
  validate(loginSchema, 'body'),
  asyncHandler(login)
);

// Route de déconnexion
router.post(
  '/logout',
  validate(logoutSchema, 'body'),
  asyncHandler(logout)
);

// Route pour obtenir les informations de la session
router.get(
  '/session',
  authenticate,
  asyncHandler(getSession)
);

export default router;

