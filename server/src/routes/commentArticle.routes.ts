import { Router, Request, Response } from 'express';
import {
  createCommentArticle,
  getCommentArticles,
  getCommentArticleById,
  updateCommentArticle,
  deleteCommentArticle,
  approveCommentArticle,
 
  IResCreateCommentArticle,
  IResGetCommentArticles,
  IResGetCommentArticle,
  IResUpdateCommentArticle,
  IResDeleteCommentArticle,
  IResApproveCommentArticle
} from '../controllers/comment-article.controllers';
import {
  createCommentArticleSchema,
  updateCommentArticleSchema,
  approveCommentArticleSchema,
  getCommentArticlesQuerySchema,
  commentArticleIdParamSchema
} from '../schemas/comment-article.schemas';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { articleAuthorOrAdminScope } from '../middleware/scope';

const router = Router();

// Wrappers typés pour les contrôleurs
const createCommentArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  // createCommentArticle n'a pas besoin du paramètre id, on passe un objet vide
  const reqWithEmptyParams = { ...req, params: {} } as unknown as Parameters<typeof createCommentArticle>[0];
  await createCommentArticle(reqWithEmptyParams, res as Response<IResCreateCommentArticle>);
});

const getCommentArticlesWrapper = asyncHandler(async (req: Request, res: Response) => {
  // getCommentArticles n'a pas besoin du paramètre id, on passe un objet vide mais on garde query
  const reqWithEmptyParams = { ...req, params: {}, query: req.query } as unknown as Parameters<typeof getCommentArticles>[0];
  await getCommentArticles(reqWithEmptyParams, res as Response<IResGetCommentArticles>);
});

const getCommentArticleByIdWrapper = asyncHandler(async (req: Request, res: Response) => {
  await getCommentArticleById(req as unknown as Parameters<typeof getCommentArticleById>[0], res as Response<IResGetCommentArticle>);
});

const updateCommentArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  await updateCommentArticle(req as unknown as Parameters<typeof updateCommentArticle>[0], res as Response<IResUpdateCommentArticle>);
});

const deleteCommentArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  await deleteCommentArticle(req as unknown as Parameters<typeof deleteCommentArticle>[0], res as Response<IResDeleteCommentArticle>);
});

const approveCommentArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  await approveCommentArticle(req as unknown as Parameters<typeof approveCommentArticle>[0], res as Response<IResApproveCommentArticle>);
});

// Routes pour les commentaires d'articles

// Obtenir tous les commentaires (sans protection)
router.get(
  '/',
  validate(getCommentArticlesQuerySchema, 'query'),
  getCommentArticlesWrapper
);

// Obtenir un commentaire par ID (sans protection)
router.get(
  '/:id',
  validate(commentArticleIdParamSchema, 'params'),
  getCommentArticleByIdWrapper
);

// Créer un commentaire (authentification requise)
router.post(
  '/',
  authenticate,
  validate(createCommentArticleSchema, 'body'),
  createCommentArticleWrapper
);

// Mettre à jour un commentaire (authentification requise, user ou admin)
router.put(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(commentArticleIdParamSchema, 'params'),
  validate(updateCommentArticleSchema, 'body'),
  updateCommentArticleWrapper
);

// Supprimer un commentaire (authentification requise, user ou admin)
router.delete(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(commentArticleIdParamSchema, 'params'),
  deleteCommentArticleWrapper
);

// Approuver/Désapprouver un commentaire (admin seulement)
router.patch(
  '/:id/approve',
  authenticate,
  articleAuthorOrAdminScope,
  validate(commentArticleIdParamSchema, 'params'),
  validate(approveCommentArticleSchema, 'body'),
  approveCommentArticleWrapper
);

export default router;
