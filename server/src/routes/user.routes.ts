import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyEmail,
  changePassword,
  toggleBanUser
} from '../controllers/user.controllers';
import {
  createUserSchema,
  updateUserSchema,
  verifyEmailSchema,
  changePasswordSchema,
  getUsersQuerySchema,
  userIdParamSchema
} from '../schemas/user.schemas';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { userScope, adminScope, userOrAdminScope, forceUserScope, meScope } from '../middleware/scope';

const router = Router();

// Routes pour les utilisateurs

// Création d'utilisateur (public)
router.post(
  '/',
  validate(createUserSchema, 'body'),
  asyncHandler(createUser)
);

// Liste des utilisateurs (admin seulement)
router.get(
  '/',
  authenticate,
  adminScope,
  validate(getUsersQuerySchema, 'query'),
  asyncHandler(getUsers)
);

// Routes pour l'utilisateur connecté (sans spécifier l'ID) - DOIT être avant /:id

// Obtenir ses propres données
router.get(
  '/me',
  authenticate,
  asyncHandler(getUserById)
);

// Mettre à jour ses propres données
router.put(
  '/me',
  authenticate,
  validate(updateUserSchema, 'body'),
  asyncHandler(updateUser)
);

// Vérifier son propre email
router.post(
  '/me/verify-email',
  authenticate,
  validate(verifyEmailSchema, 'body'),
  asyncHandler(verifyEmail)
);

// Changer son propre mot de passe
router.post(
  '/me/change-password',
  authenticate,
  validate(changePasswordSchema, 'body'),
  asyncHandler(changePassword)
);

// Obtenir un utilisateur par ID (utilisateur ou admin)
router.get(
  '/:id',
  authenticate,
  userOrAdminScope,
  validate(userIdParamSchema, 'params'),
  asyncHandler(getUserById)
);

// Mettre à jour un utilisateur (utilisateur ou admin)
router.put(
  '/:id',
  authenticate,
  userOrAdminScope,
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema, 'body'),
  asyncHandler(updateUser)
);

// Supprimer un utilisateur (admin seulement)
router.delete(
  '/:id',
  authenticate,
  adminScope,
  validate(userIdParamSchema, 'params'),
  asyncHandler(deleteUser)
);

// Routes spéciales

// Vérification d'email (utilisateur seulement)
router.post(
  '/:id/verify-email',
  authenticate,
  userScope,
  validate(userIdParamSchema, 'params'),
  validate(verifyEmailSchema, 'body'),
  asyncHandler(verifyEmail)
);

// Changement de mot de passe (utilisateur seulement)
router.post(
  '/:id/change-password',
  authenticate,
  userScope,
  validate(userIdParamSchema, 'params'),
  validate(changePasswordSchema, 'body'),
  asyncHandler(changePassword)
);

// Bannir/débannir un utilisateur (admin seulement)
router.patch(
  '/:id/ban',
  authenticate,
  adminScope,
  validate(userIdParamSchema, 'params'),
  asyncHandler(toggleBanUser)
);

export default router;
