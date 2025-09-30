import { Router } from 'express';
import {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  changeArticleStatus
} from '../controllers/article.controllers';
import {
  createArticleSchema,
  updateArticleSchema,
  getArticlesQuerySchema,
  articleIdParamSchema,
  changeArticleStatusSchema
} from '../schemas/article.schemas';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { articleAuthorOrAdminScope } from '../middleware/scope';

const router = Router();

// Routes pour les articles

// Obtenir tous les articles (sans protection)
router.get(
  '/',
  validate(getArticlesQuerySchema, 'query'),
  asyncHandler(getArticles)
);

// Obtenir un article par ID (sans protection)
router.get(
  '/:id',
  validate(articleIdParamSchema, 'params'),
  asyncHandler(getArticleById)
);

// Créer un article (authentification requise)
router.post(
  '/',
  authenticate,
  validate(createArticleSchema, 'body'),
  asyncHandler(createArticle)
);

// Mettre à jour un article (authentification requise, user ou admin)
router.put(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(articleIdParamSchema, 'params'),
  validate(updateArticleSchema, 'body'),
  asyncHandler(updateArticle)
);

// Supprimer un article (authentification requise, user ou admin)
router.delete(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(articleIdParamSchema, 'params'),
  asyncHandler(deleteArticle)
);

// Changer le statut d'un article (authentification requise, user ou admin)
router.patch(
  '/:id/status',
  authenticate,
  articleAuthorOrAdminScope,
  validate(articleIdParamSchema, 'params'),
  validate(changeArticleStatusSchema, 'body'),
  asyncHandler(changeArticleStatus)
);

export default router;
