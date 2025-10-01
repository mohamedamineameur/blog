import { Router } from 'express';
import {
  createCommentArticle,
  getCommentArticles,
  getCommentArticleById,
  updateCommentArticle,
  deleteCommentArticle,
  approveCommentArticle
} from '../controllers/commentArticle.controllers';
import {
  createCommentArticleSchema,
  updateCommentArticleSchema,
  approveCommentArticleSchema,
  getCommentArticlesQuerySchema,
  commentArticleIdParamSchema
} from '../schemas/commentArticle.schemas';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { articleAuthorOrAdminScope } from '../middleware/scope';

const router = Router();

// Routes pour les commentaires d'articles

// Obtenir tous les commentaires (sans protection)
router.get(
  '/',
  validate(getCommentArticlesQuerySchema, 'query'),
  asyncHandler(getCommentArticles)
);

// Obtenir un commentaire par ID (sans protection)
router.get(
  '/:id',
  validate(commentArticleIdParamSchema, 'params'),
  asyncHandler(getCommentArticleById)
);

// Créer un commentaire (authentification requise)
router.post(
  '/',
  authenticate,
  validate(createCommentArticleSchema, 'body'),
  asyncHandler(createCommentArticle)
);

// Mettre à jour un commentaire (authentification requise, user ou admin)
router.put(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(commentArticleIdParamSchema, 'params'),
  validate(updateCommentArticleSchema, 'body'),
  asyncHandler(updateCommentArticle)
);

// Supprimer un commentaire (authentification requise, user ou admin)
router.delete(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(commentArticleIdParamSchema, 'params'),
  asyncHandler(deleteCommentArticle)
);

// Approuver/Désapprouver un commentaire (admin seulement)
router.patch(
  '/:id/approve',
  authenticate,
  articleAuthorOrAdminScope,
  validate(commentArticleIdParamSchema, 'params'),
  validate(approveCommentArticleSchema, 'body'),
  asyncHandler(approveCommentArticle)
);

export default router;
