import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory
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

// Routes pour les catégories

// Obtenir toutes les catégories (sans protection)
router.get(
  '/',
  validate(getCategoriesQuerySchema, 'query'),
  asyncHandler(getCategories)
);

// Obtenir une catégorie par ID (sans protection)
router.get(
  '/:id',
  validate(categoryIdParamSchema, 'params'),
  asyncHandler(getCategoryById)
);

// Créer une catégorie (admin seulement)
router.post(
  '/',
  authenticate,
  adminScope,
  validate(createCategorySchema, 'body'),
  asyncHandler(createCategory)
);

// Mettre à jour une catégorie (admin seulement)
router.put(
  '/:id',
  authenticate,
  adminScope,
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema, 'body'),
  asyncHandler(updateCategory)
);

export default router;
