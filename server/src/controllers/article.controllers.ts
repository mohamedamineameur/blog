import { Request, Response } from 'express';
import { Article } from '../models/Article';
import { Category } from '../models/Category';
import { User } from '../models/User';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middleware/auth';

// Interfaces pour les requêtes
export interface IReqCreateArticle {
  categoryId: string;
  title: string;
  content: string;
  status?: 'draft' | 'published' | 'hided';
}

export interface IReqUpdateArticle {
  categoryId?: string;
  title?: string;
  content?: string;
  status?: 'draft' | 'published' | 'hided';
}

export interface IReqArticleParams {
  id: string;
}

export interface IReqArticleQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'published' | 'hided';
  categoryId?: string;
  userId?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

export interface IReqChangeStatus {
  status: 'draft' | 'published' | 'hided';
}

// Interfaces pour les réponses
export interface IResArticle {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'hided';
  createdAt: Date;
  updatedAt: Date;
  User?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  };
  Category?: {
    id: string;
    name: string;
    description: string;
  };
}

export interface IResCreateArticle {
  success: boolean;
  message: string;
  data: IResArticle | null;
}

export interface IResGetArticle {
  success: boolean;
  data: IResArticle | null;
}

export interface IResUpdateArticle {
  success: boolean;
  message: string;
  data: IResArticle | null;
}

export interface IResGetArticles {
  success: boolean;
  data: {
    data: IResArticle[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface IResDeleteArticle {
  success: boolean;
  message: string;
}

// Créer un article
export const createArticle = async (req: AuthenticatedRequest, res: Response<IResCreateArticle>): Promise<void> => {
  try {
    const { categoryId, title, content, status = 'draft' } = req.body;
    const userId = req.user!.id;

    // Vérifier que la catégorie existe
    const category = await Category.findByPk(categoryId);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée',
        data: null
      });
      return;
    }

    // Créer l'article
    const article = await Article.create({
      userId,
      categoryId,
      title,
      content,
      status
    });

    // Récupérer l'article avec les relations
    const articleWithRelations = await Article.findByPk(article.id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Category,
          as: 'Category',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Article créé avec succès',
      data: articleWithRelations as IResArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la création de l\'article:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};

// Obtenir tous les articles (sans protection)
export const getArticles = async (req: Request<object, IResGetArticles, object, IReqArticleQuery>, res: Response<IResGetArticles>): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      categoryId,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Construire les conditions de recherche
    const whereClause: Record<string, unknown> = {};
    
    if (search) {
      whereClause[Op.or as unknown as string] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    if (userId) {
      whereClause.userId = userId;
    }

    // Calculer l'offset pour la pagination
    const offset = (page - 1) * limit;

    // Récupérer les articles avec pagination
    const { count, rows } = await Article.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Category,
          as: 'Category',
          attributes: ['id', 'name', 'description']
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
        data: rows as IResArticle[],
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
    console.error('Erreur lors de la récupération des articles:', error);
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

// Obtenir un article par ID (sans protection)
export const getArticleById = async (req: Request<IReqArticleParams, IResGetArticle>, res: Response<IResGetArticle>): Promise<void> => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Category,
          as: 'Category',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    if (!article) {
      res.status(404).json({
        success: false,
        data: null
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: article as IResArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération de l\'article:', error);
    res.status(500).json({
      success: false,
      data: null
    });
  }
};

// Mettre à jour un article
export const updateArticle = async (
  req: AuthenticatedRequest, 
  res: Response<IResUpdateArticle>
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user && req.user.id;
    const isAdmin = req.user && req.user.isAdmin;

    // Vérifier si l'article existe
    const article = await Article.findByPk(id);
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Article non trouvé',
        data: null
      });
      return;
    }

    // Vérifier les permissions : seul l'auteur ou un admin peut modifier
    if (!isAdmin && article.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que vos propres articles',
        data: null
      });
      return;
    }

    // Si la catégorie est modifiée, vérifier qu'elle existe
    if (updateData.categoryId && updateData.categoryId !== article.categoryId) {
      const category = await Category.findByPk(updateData.categoryId);
      if (!category) {
        res.status(404).json({
          success: false,
          message: 'Catégorie non trouvée',
          data: null
        });
        return;
      }
    }

    // Mettre à jour l'article
    await article.update(updateData);

    // Récupérer l'article mis à jour avec les relations
    const updatedArticle = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Category,
          as: 'Category',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Article mis à jour avec succès',
      data: updatedArticle as IResArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la mise à jour de l\'article:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};

// Supprimer un article
export const deleteArticle = async (
  req: AuthenticatedRequest, 
  res: Response<IResDeleteArticle>
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;

    // Vérifier si l'article existe
    const article = await Article.findByPk(id);
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Article non trouvé'
      });
      return;
    }

    // Vérifier les permissions : seul l'auteur ou un admin peut supprimer
    if (!isAdmin && article.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres articles'
      });
      return;
    }

    // Supprimer l'article
    await article.destroy();

    res.status(200).json({
      success: true,
      message: 'Article supprimé avec succès'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la suppression de l\'article:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Changer le statut d'un article
export const changeArticleStatus = async (
  req: AuthenticatedRequest, 
  res: Response<IResUpdateArticle>
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;

    // Vérifier si l'article existe
    const article = await Article.findByPk(id);
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Article non trouvé',
        data: null
      });
      return;
    }

    // Vérifier les permissions : seul l'auteur ou un admin peut changer le statut
    if (!isAdmin && article.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que vos propres articles',
        data: null
      });
      return;
    }

    // Mettre à jour le statut
    await article.update({ status });

    // Récupérer l'article mis à jour avec les relations
    const updatedArticle = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstname', 'lastname', 'email']
        },
        {
          model: Category,
          as: 'Category',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Statut de l\'article mis à jour avec succès',
      data: updatedArticle as IResArticle
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};
