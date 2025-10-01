import { Router, Request, Response } from 'express';
import {
  createLikeArticle,
  getLikeArticles,
  getLikeArticleById,
  updateLikeArticle,
  deleteLikeArticle,
  getArticleLikeStats,
 
  IResCreateLikeArticle,
  IResGetLikeArticles,
  IResGetLikeArticle,
  IResUpdateLikeArticle,
  IResDeleteLikeArticle,
  
} from '../controllers/like-article.controllers';
import {
  createLikeArticleSchema,
  updateLikeArticleSchema,
  getLikeArticlesQuerySchema,
  likeArticleIdParamSchema,
  articleIdParamSchema
} from '../schemas/like-article.schemas';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { articleAuthorOrAdminScope } from '../middleware/scope';

const router = Router();

// Wrappers typés pour les contrôleurs
const createLikeArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  // createLikeArticle n'a pas besoin du paramètre id, on passe un objet vide
  const reqWithEmptyParams = { ...req, params: {} } as unknown as Parameters<typeof createLikeArticle>[0];
  await createLikeArticle(reqWithEmptyParams, res as Response<IResCreateLikeArticle>);
});

const getLikeArticlesWrapper = asyncHandler(async (req: Request, res: Response) => {
  // getLikeArticles n'a pas besoin du paramètre id, on passe un objet vide mais on garde query
  const reqWithEmptyParams = { ...req, params: {}, query: req.query } as unknown as Parameters<typeof getLikeArticles>[0];
  await getLikeArticles(reqWithEmptyParams, res as Response<IResGetLikeArticles>);
});

const getLikeArticleByIdWrapper = asyncHandler(async (req: Request, res: Response) => {
  await getLikeArticleById(req as unknown as Parameters<typeof getLikeArticleById>[0], res as Response<IResGetLikeArticle>);
});

const updateLikeArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  await updateLikeArticle(req as unknown as Parameters<typeof updateLikeArticle>[0], res as Response<IResUpdateLikeArticle>);
});

const deleteLikeArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  await deleteLikeArticle(req as unknown as Parameters<typeof deleteLikeArticle>[0], res as Response<IResDeleteLikeArticle>);
});

const getArticleLikeStatsWrapper = asyncHandler(async (req: Request, res: Response) => {
  await getArticleLikeStats(req as unknown as Parameters<typeof getArticleLikeStats>[0], res );
});

// Routes pour les likes d'articles

// Obtenir tous les likes (sans protection)
router.get(
  '/',
  validate(getLikeArticlesQuerySchema, 'query'),
  getLikeArticlesWrapper
);

// Obtenir un like par ID (sans protection)
router.get(
  '/:id',
  validate(likeArticleIdParamSchema, 'params'),
  getLikeArticleByIdWrapper
);

// Obtenir les statistiques de likes pour un article (sans protection)
router.get(
  '/stats/:articleId',
  validate(articleIdParamSchema, 'params'),
  getArticleLikeStatsWrapper
);

// Créer un like (authentification requise)
router.post(
  '/',
  authenticate,
  validate(createLikeArticleSchema, 'body'),
  createLikeArticleWrapper
);

// Mettre à jour un like (authentification requise, user ou admin)
router.put(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(likeArticleIdParamSchema, 'params'),
  validate(updateLikeArticleSchema, 'body'),
  updateLikeArticleWrapper
);

// Supprimer un like (authentification requise, user ou admin)
router.delete(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(likeArticleIdParamSchema, 'params'),
  deleteLikeArticleWrapper
);

export default router;
