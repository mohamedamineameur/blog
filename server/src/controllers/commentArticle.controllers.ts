import { Request, Response } from 'express';
import { CommentArticle } from '../models/CommentArticle';
import { Article } from '../models/Article';
import { User } from '../models/User';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middleware/auth';

// Interfaces pour les requêtes
export interface IReqCreateCommentArticle {
  articleId: string;
  content: string;
  parentId?: string | null;
}

export interface IReqUpdateCommentArticle {
  content: string;
}

export interface IReqApproveCommentArticle {
  isApproved: boolean;
}

export interface IReqCommentArticleParams {
  id: string;
}

export interface IReqCommentArticleQuery {
  page?: number;
  limit?: number;
  articleId?: string;
  userId?: string;
  parentId?: string | null;
  isApproved?: boolean;
  includeReplies?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'content';
  sortOrder?: 'ASC' | 'DESC';
}

export interface IReqArticleParams {
  articleId: string;
}

// Interfaces pour les réponses
export interface IResCommentArticle {
  id: string;
  userId: string;
  articleId: string;
  content: string;
  parentId: string | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  User?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  };
  Article?: {
    id: string;
    title: string;
    content: string;
    status: string;
  };
  Parent?: IResCommentArticle;
  Replies?: IResCommentArticle[];
  _count?: {
    replies: number;
  };
}

export interface IResCreateCommentArticle {
  success: boolean;
  message: string;
  data: IResCommentArticle | null;
}

export interface IResGetCommentArticle {
  success: boolean;
  data: IResCommentArticle | null;
}

export interface IResUpdateCommentArticle {
  success: boolean;
  message: string;
  data: IResCommentArticle | null;
}

export interface IResGetCommentArticles {
  success: boolean;
  data: {
    data: IResCommentArticle[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface IResDeleteCommentArticle {
  success: boolean;
  message: string;
}

export interface IResApproveCommentArticle {
  success: boolean;
  message: string;
  data: IResCommentArticle | null;
}

// Créer un commentaire
export const createCommentArticle = async (req: AuthenticatedRequest<IReqCommentArticleParams, IResCreateCommentArticle, IReqCreateCommentArticle>, res: Response<IResCreateCommentArticle>): Promise<void> => {
  try {
    const { articleId, content, parentId } = req.body;
    const userId = req.user!.id;

    // Vérifier que l'article existe
    const article = await Article.findByPk(articleId);
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Article non trouvé',
        data: null
      });
      return;
    }

    // Si c'est une réponse à un commentaire, vérifier que le commentaire parent existe
    if (parentId) {
      const parentComment = await CommentArticle.findByPk(parentId);
      if (!parentComment) {
        res.status(404).json({
          success: false,
          message: 'Commentaire parent non trouvé',
          data: null
        });
        return;
      }

      // Vérifier que le commentaire parent appartient au même article
      if (parentComment.articleId !== articleId) {
        res.status(400).json({
          success: false,
          message: 'Le commentaire parent doit appartenir au même article',
          data: null
        });
        return;
      }
    }

    // Créer le commentaire
    const comment = await CommentArticle.create({
      userId,
      articleId,
      content,
      parentId: parentId || null
    });

    // Récupérer le commentaire avec les relations
    const commentWithRelations = await CommentArticle.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Article,
          as: 'Article',
          attributes: ['id', 'title', 'content', 'status']
        },
        {
          model: CommentArticle,
          as: 'Parent',
          attributes: ['id', 'content', 'createdAt'],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'firstname', 'lastname']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Commentaire créé avec succès',
      data: commentWithRelations as IResCommentArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la création du commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};

// Obtenir tous les commentaires (sans protection)
export const getCommentArticles = async (req: Request<object, IResGetCommentArticles, object, IReqCommentArticleQuery>, res: Response<IResGetCommentArticles>): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      articleId,
      userId,
      parentId,
      isApproved,
      includeReplies = true,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Construire les conditions de recherche
    const whereClause: any = {};
    
    if (articleId) {
      whereClause.articleId = articleId;
    }
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (parentId !== undefined) {
      whereClause.parentId = parentId;
    }
    
    if (isApproved !== undefined) {
      whereClause.isApproved = isApproved === 'true' || isApproved === true;
    }

    // Calculer l'offset pour la pagination
    const offset = (page - 1) * limit;

    // Configuration des includes
    const includeConfig: any[] = [
      {
        model: User,
        as: 'User',
        attributes: ['id', 'firstname', 'lastname', 'email']
      },
      {
        model: Article,
        as: 'Article',
        attributes: ['id', 'title', 'content', 'status']
      }
    ];

    // Ajouter les réponses si demandé
    if (includeReplies) {
      includeConfig.push({
        model: CommentArticle,
        as: 'Replies',
        attributes: ['id', 'content', 'createdAt', 'isApproved'],
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'firstname', 'lastname']
          }
        ],
        order: [['createdAt', 'ASC']]
      });
    }

    // Récupérer les commentaires avec pagination
    const { count, rows } = await CommentArticle.findAndCountAll({
      where: whereClause,
      include: includeConfig,
      order: [[sortBy, sortOrder]],
      limit: Number(limit),
      offset: Number(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: {
        data: rows as IResCommentArticle[],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          totalPages
        }
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération des commentaires:', error);
    res.status(500).json({
      success: false,
      data: {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      }
    });
  }
};

// Obtenir un commentaire par ID (sans protection)
export const getCommentArticleById = async (req: Request<IReqCommentArticleParams, IResGetCommentArticle>, res: Response<IResGetCommentArticle>): Promise<void> => {
  try {
    const { id } = req.params;

    const comment = await CommentArticle.findByPk(id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Article,
          as: 'Article',
          attributes: ['id', 'title', 'content', 'status']
        },
        {
          model: CommentArticle,
          as: 'Parent',
          attributes: ['id', 'content', 'createdAt'],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'firstname', 'lastname']
            }
          ]
        },
        {
          model: CommentArticle,
          as: 'Replies',
          attributes: ['id', 'content', 'createdAt', 'isApproved'],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'firstname', 'lastname']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        data: null
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: comment as IResCommentArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération du commentaire:', error);
    res.status(500).json({
      success: false,
      data: null
    });
  }
};

// Mettre à jour un commentaire
export const updateCommentArticle = async (req: AuthenticatedRequest<IReqCommentArticleParams, IResUpdateCommentArticle, IReqUpdateCommentArticle>, res: Response<IResUpdateCommentArticle>): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;

    // Vérifier si le commentaire existe
    const comment = await CommentArticle.findByPk(id);
    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Commentaire non trouvé',
        data: null
      });
      return;
    }

    // Vérifier les permissions : seul l'auteur du commentaire ou un admin peut modifier
    if (!isAdmin && comment.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que vos propres commentaires',
        data: null
      });
      return;
    }

    // Mettre à jour le commentaire
    await comment.update({ content });

    // Récupérer le commentaire mis à jour avec les relations
    const updatedComment = await CommentArticle.findByPk(id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Article,
          as: 'Article',
          attributes: ['id', 'title', 'content', 'status']
        },
        {
          model: CommentArticle,
          as: 'Parent',
          attributes: ['id', 'content', 'createdAt'],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'firstname', 'lastname']
            }
          ]
        },
        {
          model: CommentArticle,
          as: 'Replies',
          attributes: ['id', 'content', 'createdAt', 'isApproved'],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'firstname', 'lastname']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Commentaire mis à jour avec succès',
      data: updatedComment as IResCommentArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la mise à jour du commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};

// Supprimer un commentaire
export const deleteCommentArticle = async (req: AuthenticatedRequest<IReqCommentArticleParams, IResDeleteCommentArticle>, res: Response<IResDeleteCommentArticle>): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;

    // Vérifier si le commentaire existe
    const comment = await CommentArticle.findByPk(id);
    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Commentaire non trouvé'
      });
      return;
    }

    // Vérifier les permissions : seul l'auteur du commentaire ou un admin peut supprimer
    if (!isAdmin && comment.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres commentaires'
      });
      return;
    }

    // Supprimer le commentaire (cela supprimera aussi les réponses)
    await comment.destroy();

    res.status(200).json({
      success: true,
      message: 'Commentaire supprimé avec succès'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la suppression du commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Approuver/Désapprouver un commentaire (admin seulement)
export const approveCommentArticle = async (req: AuthenticatedRequest<IReqCommentArticleParams, IResApproveCommentArticle, IReqApproveCommentArticle>, res: Response<IResApproveCommentArticle>): Promise<void> => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    const isAdmin = req.user!.isAdmin;

    // Vérifier que l'utilisateur est admin
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Accès refusé : privilèges administrateur requis',
        data: null
      });
      return;
    }

    // Vérifier si le commentaire existe
    const comment = await CommentArticle.findByPk(id);
    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Commentaire non trouvé',
        data: null
      });
      return;
    }

    // Mettre à jour le statut d'approbation
    await comment.update({ isApproved });

    // Récupérer le commentaire mis à jour avec les relations
    const updatedComment = await CommentArticle.findByPk(id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Article,
          as: 'Article',
          attributes: ['id', 'title', 'content', 'status']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Commentaire ${isApproved ? 'approuvé' : 'désapprouvé'} avec succès`,
      data: updatedComment as IResCommentArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de l\'approbation du commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};
