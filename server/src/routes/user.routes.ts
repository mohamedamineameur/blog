import { Router, Request, Response } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyEmail,
  changePassword,
  toggleBanUser,
  IReqCreateUser,
  IReqUpdateUser,
  IReqVerifyEmail,
  IReqChangePassword,
  IReqToggleBan,
  IReqUserParams,
  IReqPaginationParams,
  IResCreateUser,
  IResGetUsers,
  IResGetUser,
  IResUpdateUser,
  IResDeleteUser,
  IResVerifyEmail,
  IResChangePassword,
  IResToggleBan
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
import { userScope, adminScope, userOrAdminScope } from '../middleware/scope';

const router = Router();

// Wrappers typés pour les contrôleurs
const createUserWrapper = asyncHandler(async (req: Request, res: Response) => {
  // createUser n'a pas besoin du paramètre id, on passe un objet vide
  const reqWithEmptyParams = { ...req, params: {} } as unknown as Request<IReqUserParams, IResCreateUser, IReqCreateUser>;
  await createUser(reqWithEmptyParams, res as Response<IResCreateUser>);
});

const getUsersWrapper = asyncHandler(async (req: Request, res: Response) => {
  // getUsers n'a pas besoin du paramètre id, on passe un objet vide mais on garde query
  const reqWithEmptyParams = { ...req, params: {}, query: req.query } as unknown as Request<IReqUserParams, IResGetUsers, IReqPaginationParams>;
  await getUsers(reqWithEmptyParams, res as Response<IResGetUsers>);
});

const getUserByIdWrapper = asyncHandler(async (req: Request, res: Response) => {
  await getUserById(req as unknown as Request<IReqUserParams, IResGetUser>, res as Response<IResGetUser>);
});

const updateUserWrapper = asyncHandler(async (req: Request, res: Response) => {
  await updateUser(req as unknown as Request<IReqUserParams, IResUpdateUser, IReqUpdateUser>, res as Response<IResUpdateUser>);
});

const deleteUserWrapper = asyncHandler(async (req: Request, res: Response) => {
  await deleteUser(req as unknown as Request<IReqUserParams, IResDeleteUser>, res as Response<IResDeleteUser>);
});

const verifyEmailWrapper = asyncHandler(async (req: Request, res: Response) => {
  await verifyEmail(req as unknown as Request<IReqUserParams, IResVerifyEmail, IReqVerifyEmail>, res as Response<IResVerifyEmail>);
});

const changePasswordWrapper = asyncHandler(async (req: Request, res: Response) => {
  await changePassword(req as unknown as Request<IReqUserParams, IResChangePassword, IReqChangePassword>, res as Response<IResChangePassword>);
});

const toggleBanUserWrapper = asyncHandler(async (req: Request, res: Response) => {
  await toggleBanUser(req as unknown as Request<IReqUserParams, IResToggleBan, IReqToggleBan>, res as Response<IResToggleBan>);
});

// Routes pour les utilisateurs

// Création d'utilisateur (public)
router.post(
  '/',
  validate(createUserSchema, 'body'),
  createUserWrapper
);

// Liste des utilisateurs (admin seulement)
router.get(
  '/',
  authenticate,
  adminScope,
  validate(getUsersQuerySchema, 'query'),
  getUsersWrapper
);

// Routes pour l'utilisateur connecté (sans spécifier l'ID) - DOIT être avant /:id

// Obtenir ses propres données
router.get(
  '/me',
  authenticate,
  getUserByIdWrapper
);

// Mettre à jour ses propres données
router.put(
  '/me',
  authenticate,
  validate(updateUserSchema, 'body'),
  updateUserWrapper
);

// Vérifier son propre email
router.post(
  '/me/verify-email',
  authenticate,
  validate(verifyEmailSchema, 'body'),
  verifyEmailWrapper
);

// Changer son propre mot de passe
router.post(
  '/me/change-password',
  authenticate,
  validate(changePasswordSchema, 'body'),
  changePasswordWrapper
);

// Obtenir un utilisateur par ID (utilisateur ou admin)
router.get(
  '/:id',
  authenticate,
  userOrAdminScope,
  validate(userIdParamSchema, 'params'),
  getUserByIdWrapper
);

// Mettre à jour un utilisateur (utilisateur ou admin)
router.put(
  '/:id',
  authenticate,
  userOrAdminScope,
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema, 'body'),
  updateUserWrapper
);

// Supprimer un utilisateur (admin seulement)
router.delete(
  '/:id',
  authenticate,
  adminScope,
  validate(userIdParamSchema, 'params'),
  deleteUserWrapper
);

// Routes spéciales

// Vérification d'email (utilisateur seulement)
router.post(
  '/:id/verify-email',
  authenticate,
  userScope,
  validate(userIdParamSchema, 'params'),
  validate(verifyEmailSchema, 'body'),
  verifyEmailWrapper
);

// Changement de mot de passe (utilisateur seulement)
router.post(
  '/:id/change-password',
  authenticate,
  userScope,
  validate(userIdParamSchema, 'params'),
  validate(changePasswordSchema, 'body'),
  changePasswordWrapper
);

// Bannir/débannir un utilisateur (admin seulement)
router.patch(
  '/:id/ban',
  authenticate,
  adminScope,
  validate(userIdParamSchema, 'params'),
  toggleBanUserWrapper
);

export default router;
