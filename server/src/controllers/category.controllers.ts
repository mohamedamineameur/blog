import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Op } from 'sequelize';

// Interfaces pour les requêtes
export interface IReqCreateCategory {
  name: string;
  description: string;
}

export interface IReqUpdateCategory {
  name?: string;
  description?: string;
}

export interface IReqCategoryParams {
  id: string;
}

export interface IReqCategoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

// Interfaces pour les réponses
export interface IResCategory {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResCreateCategory {
  success: boolean;
  message: string;
  data: IResCategory | null;
}

export interface IResGetCategory {
  success: boolean;
  data: IResCategory | null;
}

export interface IResUpdateCategory {
  success: boolean;
  message: string;
  data: IResCategory | null;
}

export interface IResGetCategories {
  success: boolean;
  data: {
    data: IResCategory[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Créer une catégorie (admin seulement)
export const createCategory = async (req: Request<IReqCategoryParams, IResCreateCategory, IReqCreateCategory>, res: Response<IResCreateCategory>): Promise<void> => {
  try {
    const { name, description } = req.body;

    // Vérifier si une catégorie avec ce nom existe déjà
    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      res.status(409).json({
        success: false,
        message: 'Une catégorie avec ce nom existe déjà',
        data: null
      });
      return;
    }

    // Créer la nouvelle catégorie
    const category = await Category.create({
      name,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: category as IResCategory
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};

// Obtenir toutes les catégories (sans protection)
export const getCategories = async (req: Request<object, IResGetCategories, object, IReqCategoryQuery>, res: Response<IResGetCategories>): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'ASC'
    } = req.query;

    // Construire les conditions de recherche
    // Utilisation d'un typage plus précis pour éviter 'any'
    const whereClause: Record<string | symbol, unknown> = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    

    // Calculer l'offset pour la pagination
    const offset = (page - 1) * limit;

    // Récupérer les catégories avec pagination
    const { count, rows } = await Category.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: Number(limit),
      offset: Number(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: {
        data: rows as IResCategory[],
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
    console.error('Erreur lors de la récupération des catégories:', error);
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

// Obtenir une catégorie par ID (sans protection)
export const getCategoryById = async (req: Request<IReqCategoryParams, IResGetCategory>, res: Response<IResGetCategory>): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      res.status(404).json({
        success: false,
        data: null
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: category as IResCategory
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération de la catégorie:', error);
    res.status(500).json({
      success: false,
      data: null
    });
  }
};

// Mettre à jour une catégorie (admin seulement)
export const updateCategory = async (req: Request<IReqCategoryParams, IResUpdateCategory, IReqUpdateCategory>, res: Response<IResUpdateCategory>): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Vérifier si la catégorie existe
    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée',
        data: null
      });
      return;
    }

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà
    if (updateData.name && updateData.name !== category.name) {
      const existingCategory = await Category.findOne({
        where: {
          name: updateData.name,
          id: { [Op.ne]: id }
        }
      });
      if (existingCategory) {
        res.status(409).json({
          success: false,
          message: 'Une catégorie avec ce nom existe déjà',
          data: null
        });
        return;
      }
    }

    // Mettre à jour la catégorie
    await category.update(updateData);

    // Récupérer la catégorie mise à jour
    const updatedCategory = await Category.findByPk(id);

    res.status(200).json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: updatedCategory as IResCategory
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};
