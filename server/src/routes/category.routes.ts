import { Router, Request, Response } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  IResCreateCategory,
  IResGetCategories,
  IResGetCategory,
  IResUpdateCategory
} from '../controllers/category.controllers';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesQuerySchema,
  categoryIdParamSchema
} from '../schemas/category.schemas';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { adminScope } from '../middleware/scope';

const router = Router();

// Wrappers typés pour les contrôleurs
const createCategoryWrapper = asyncHandler(async (req: Request, res: Response) => {
  // createCategory n'a pas besoin du paramètre id, on passe un objet vide
  const reqWithEmptyParams = { ...req, params: {} } as unknown as Parameters<typeof createCategory>[0];
  await createCategory(reqWithEmptyParams, res as Response<IResCreateCategory>);
});

const getCategoriesWrapper = asyncHandler(async (req: Request, res: Response) => {
  // getCategories n'a pas besoin du paramètre id, on passe un objet vide mais on garde query
  const reqWithEmptyParams = { ...req, params: {}, query: req.query } as unknown as Parameters<typeof getCategories>[0];
  await getCategories(reqWithEmptyParams, res as Response<IResGetCategories>);
});

const getCategoryByIdWrapper = asyncHandler(async (req: Request, res: Response) => {
  await getCategoryById(req as unknown as Parameters<typeof getCategoryById>[0], res as Response<IResGetCategory>);
});

const updateCategoryWrapper = asyncHandler(async (req: Request, res: Response) => {
  await updateCategory(req as unknown as Parameters<typeof updateCategory>[0], res as Response<IResUpdateCategory>);
});

// Routes pour les catégories

// Obtenir toutes les catégories (sans protection)
router.get(
  '/',
  validate(getCategoriesQuerySchema, 'query'),
  getCategoriesWrapper
);

// Obtenir une catégorie par ID (sans protection)
router.get(
  '/:id',
  validate(categoryIdParamSchema, 'params'),
  getCategoryByIdWrapper
);

// Créer une catégorie (admin seulement)
router.post(
  '/',
  authenticate,
  adminScope,
  validate(createCategorySchema, 'body'),
  createCategoryWrapper
);

// Mettre à jour une catégorie (admin seulement)
router.put(
  '/:id',
  authenticate,
  adminScope,
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema, 'body'),
  updateCategoryWrapper
);

export default router;
