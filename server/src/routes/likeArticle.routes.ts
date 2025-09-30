import { Router } from 'express';
import {
  createLikeArticle,
  getLikeArticles,
  getLikeArticleById,
  updateLikeArticle,
  deleteLikeArticle,
  getArticleLikeStats
} from '../controllers/likeArticle.controllers';
import {
  createLikeArticleSchema,
  updateLikeArticleSchema,
  getLikeArticlesQuerySchema,
  likeArticleIdParamSchema,
  articleIdParamSchema
} from '../schemas/likeArticle.schemas';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { articleAuthorOrAdminScope } from '../middleware/scope';

const router = Router();

// Routes pour les likes d'articles

// Obtenir tous les likes (sans protection)
router.get(
  '/',
  validate(getLikeArticlesQuerySchema, 'query'),
  asyncHandler(getLikeArticles)
);

// Obtenir un like par ID (sans protection)
router.get(
  '/:id',
  validate(likeArticleIdParamSchema, 'params'),
  asyncHandler(getLikeArticleById)
);

// Obtenir les statistiques de likes pour un article (sans protection)
router.get(
  '/stats/:articleId',
  validate(articleIdParamSchema, 'params'),
  asyncHandler(getArticleLikeStats)
);

// Créer un like (authentification requise)
router.post(
  '/',
  authenticate,
  validate(createLikeArticleSchema, 'body'),
  asyncHandler(createLikeArticle)
);

// Mettre à jour un like (authentification requise, user ou admin)
router.put(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(likeArticleIdParamSchema, 'params'),
  validate(updateLikeArticleSchema, 'body'),
  asyncHandler(updateLikeArticle)
);

// Supprimer un like (authentification requise, user ou admin)
router.delete(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(likeArticleIdParamSchema, 'params'),
  asyncHandler(deleteLikeArticle)
);

export default router;
