import { Router, Request, Response } from 'express';
import {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  changeArticleStatus,
  IResCreateArticle,
  IResGetArticles,
  IResGetArticle,
  IResUpdateArticle,
  IResDeleteArticle
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

// Wrappers typés pour les contrôleurs
const createArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  // createArticle n'a pas besoin du paramètre id, on passe un objet vide
  const reqWithEmptyParams = { ...req, params: {} } as unknown as Parameters<typeof createArticle>[0];
  await createArticle(reqWithEmptyParams, res as Response<IResCreateArticle>);
});

const getArticlesWrapper = asyncHandler(async (req: Request, res: Response) => {
  // getArticles n'a pas besoin du paramètre id, on passe un objet vide mais on garde query
  const reqWithEmptyParams = { ...req, params: {}, query: req.query } as unknown as Parameters<typeof getArticles>[0];
  await getArticles(reqWithEmptyParams, res as Response<IResGetArticles>);
});

const getArticleByIdWrapper = asyncHandler(async (req: Request, res: Response) => {
  await getArticleById(req as unknown as Parameters<typeof getArticleById>[0], res as Response<IResGetArticle>);
});

const updateArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  await updateArticle(req as unknown as Parameters<typeof updateArticle>[0], res as Response<IResUpdateArticle>);
});

const deleteArticleWrapper = asyncHandler(async (req: Request, res: Response) => {
  await deleteArticle(req as unknown as Parameters<typeof deleteArticle>[0], res as Response<IResDeleteArticle>);
});

const changeArticleStatusWrapper = asyncHandler(async (req: Request, res: Response) => {
  await changeArticleStatus(req as unknown as Parameters<typeof changeArticleStatus>[0], res as Response<IResUpdateArticle>);
});

// Routes pour les articles

// Obtenir tous les articles (sans protection)
router.get(
  '/',
  validate(getArticlesQuerySchema, 'query'),
  getArticlesWrapper
);

// Obtenir un article par ID (sans protection)
router.get(
  '/:id',
  validate(articleIdParamSchema, 'params'),
  getArticleByIdWrapper
);

// Créer un article (authentification requise)
router.post(
  '/',
  authenticate,
  validate(createArticleSchema, 'body'),
  createArticleWrapper
);

// Mettre à jour un article (authentification requise, user ou admin)
router.put(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(articleIdParamSchema, 'params'),
  validate(updateArticleSchema, 'body'),
  updateArticleWrapper
);

// Supprimer un article (authentification requise, user ou admin)
router.delete(
  '/:id',
  authenticate,
  articleAuthorOrAdminScope,
  validate(articleIdParamSchema, 'params'),
  deleteArticleWrapper
);

// Changer le statut d'un article (authentification requise, user ou admin)
router.patch(
  '/:id/status',
  authenticate,
  articleAuthorOrAdminScope,
  validate(articleIdParamSchema, 'params'),
  validate(changeArticleStatusSchema, 'body'),
  changeArticleStatusWrapper
);

export default router;
