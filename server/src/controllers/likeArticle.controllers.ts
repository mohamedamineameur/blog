import { Request, Response } from 'express';
import { LikeArticle } from '../models/LikeArticle';
import { Article } from '../models/Article';
import { User } from '../models/User';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middleware/auth';

// Interfaces pour les requêtes
export interface IReqCreateLikeArticle {
  articleId: string;
  type: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
}

export interface IReqUpdateLikeArticle {
  type: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
}

export interface IReqLikeArticleParams {
  id: string;
}

export interface IReqLikeArticleQuery {
  page?: number;
  limit?: number;
  type?: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
  articleId?: string;
  userId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'type';
  sortOrder?: 'ASC' | 'DESC';
}

export interface IReqArticleParams {
  articleId: string;
}

// Interfaces pour les réponses
export interface IResLikeArticle {
  id: string;
  userId: string;
  articleId: string;
  type: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
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
}

export interface IResCreateLikeArticle {
  success: boolean;
  message: string;
  data: IResLikeArticle | null;
}

export interface IResGetLikeArticle {
  success: boolean;
  data: IResLikeArticle | null;
}

export interface IResUpdateLikeArticle {
  success: boolean;
  message: string;
  data: IResLikeArticle | null;
}

export interface IResGetLikeArticles {
  success: boolean;
  data: {
    data: IResLikeArticle[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface IResDeleteLikeArticle {
  success: boolean;
  message: string;
}

export interface IResLikeStats {
  success: boolean;
  data: {
    articleId: string;
    stats: {
      like: number;
      love: number;
      care: number;
      haha: number;
      wow: number;
      sad: number;
      angry: number;
      total: number;
    };
  };
}

// Créer un like pour un article
export const createLikeArticle = async (req: AuthenticatedRequest<IReqLikeArticleParams, IResCreateLikeArticle, IReqCreateLikeArticle>, res: Response<IResCreateLikeArticle>): Promise<void> => {
  try {
    const { articleId, type } = req.body;
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

    // Vérifier si l'utilisateur a déjà liké cet article
    const existingLike = await LikeArticle.findOne({
      where: { userId, articleId }
    });

    if (existingLike) {
      // Mettre à jour le type de like existant
      await existingLike.update({ type });

      // Récupérer le like mis à jour avec les relations
      const updatedLike = await LikeArticle.findByPk(existingLike.id, {
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
        message: 'Like mis à jour avec succès',
        data: updatedLike as IResLikeArticle
      });
      return;
    }

    // Créer un nouveau like
    const like = await LikeArticle.create({
      userId,
      articleId,
      type
    });

    // Récupérer le like avec les relations
    const likeWithRelations = await LikeArticle.findByPk(like.id, {
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

    res.status(201).json({
      success: true,
      message: 'Like créé avec succès',
      data: likeWithRelations as IResLikeArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la création du like:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};

// Obtenir tous les likes (sans protection)
export const getLikeArticles = async (req: Request<object, IResGetLikeArticles, object, IReqLikeArticleQuery>, res: Response<IResGetLikeArticles>): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      articleId,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Construire les conditions de recherche
    const whereClause: any = {};
    
    if (type) {
      whereClause.type = type;
    }
    
    if (articleId) {
      whereClause.articleId = articleId;
    }
    
    if (userId) {
      whereClause.userId = userId;
    }

    // Calculer l'offset pour la pagination
    const offset = (page - 1) * limit;

    // Récupérer les likes avec pagination
    const { count, rows } = await LikeArticle.findAndCountAll({
      where: whereClause,
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
      ],
      order: [[sortBy, sortOrder]],
      limit: Number(limit),
      offset: Number(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: {
        data: rows as IResLikeArticle[],
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
    console.error('Erreur lors de la récupération des likes:', error);
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

// Obtenir un like par ID (sans protection)
export const getLikeArticleById = async (req: Request<IReqLikeArticleParams, IResGetLikeArticle>, res: Response<IResGetLikeArticle>): Promise<void> => {
  try {
    const { id } = req.params;

    const like = await LikeArticle.findByPk(id, {
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

    if (!like) {
      res.status(404).json({
        success: false,
        data: null
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: like as IResLikeArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération du like:', error);
    res.status(500).json({
      success: false,
      data: null
    });
  }
};

// Mettre à jour un like
export const updateLikeArticle = async (req: AuthenticatedRequest<IReqLikeArticleParams, IResUpdateLikeArticle, IReqUpdateLikeArticle>, res: Response<IResUpdateLikeArticle>): Promise<void> => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;

    // Vérifier si le like existe
    const like = await LikeArticle.findByPk(id);
    if (!like) {
      res.status(404).json({
        success: false,
        message: 'Like non trouvé',
        data: null
      });
      return;
    }

    // Vérifier les permissions : seul l'auteur du like ou un admin peut modifier
    if (!isAdmin && like.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que vos propres likes',
        data: null
      });
      return;
    }

    // Mettre à jour le like
    await like.update({ type });

    // Récupérer le like mis à jour avec les relations
    const updatedLike = await LikeArticle.findByPk(id, {
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
      message: 'Like mis à jour avec succès',
      data: updatedLike as IResLikeArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la mise à jour du like:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};

// Supprimer un like
export const deleteLikeArticle = async (req: AuthenticatedRequest<IReqLikeArticleParams, IResDeleteLikeArticle>, res: Response<IResDeleteLikeArticle>): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;

    // Vérifier si le like existe
    const like = await LikeArticle.findByPk(id);
    if (!like) {
      res.status(404).json({
        success: false,
        message: 'Like non trouvé'
      });
      return;
    }

    // Vérifier les permissions : seul l'auteur du like ou un admin peut supprimer
    if (!isAdmin && like.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres likes'
      });
      return;
    }

    // Supprimer le like
    await like.destroy();

    res.status(200).json({
      success: true,
      message: 'Like supprimé avec succès'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la suppression du like:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Obtenir les statistiques de likes pour un article
export const getArticleLikeStats = async (req: Request<IReqArticleParams, IResLikeStats>, res: Response<IResLikeStats>): Promise<void> => {
  try {
    const { articleId } = req.params;

    // Vérifier que l'article existe
    const article = await Article.findByPk(articleId);
    if (!article) {
      res.status(404).json({
        success: false,
        data: {
          articleId,
          stats: {
            like: 0,
            love: 0,
            care: 0,
            haha: 0,
            wow: 0,
            sad: 0,
            angry: 0,
            total: 0
          }
        }
      });
      return;
    }

    // Compter les likes par type
    const stats = await LikeArticle.findAll({
      where: { articleId },
      attributes: [
        'type',
        [LikeArticle.sequelize!.fn('COUNT', LikeArticle.sequelize!.col('type')), 'count']
      ],
      group: ['type']
    });

    // Initialiser les compteurs
    const counts = {
      like: 0,
      love: 0,
      care: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
      total: 0
    };

    // Remplir les compteurs
    stats.forEach((stat: any) => {
      const type = stat.type;
      const count = parseInt(stat.dataValues.count);
      counts[type as keyof typeof counts] = count;
      counts.total += count;
    });

    res.status(200).json({
      success: true,
      data: {
        articleId,
        stats: counts
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      data: {
        articleId: req.params.articleId,
        stats: {
          like: 0,
          love: 0,
          care: 0,
          haha: 0,
          wow: 0,
          sad: 0,
          angry: 0,
          total: 0
        }
      }
    });
  }
};
