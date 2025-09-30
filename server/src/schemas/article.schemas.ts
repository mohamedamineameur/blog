import Joi from 'joi';

// Schéma pour la création d'un article
export const createArticleSchema = Joi.object({
  categoryId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'L\'ID de la catégorie doit être un UUID valide',
      'any.required': 'L\'ID de la catégorie est requis'
    }),
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Le titre de l\'article est requis',
      'string.min': 'Le titre de l\'article doit contenir au moins 1 caractère',
      'string.max': 'Le titre de l\'article ne peut pas dépasser 200 caractères',
      'any.required': 'Le titre de l\'article est requis'
    }),
  content: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.empty': 'Le contenu de l\'article est requis',
      'string.min': 'Le contenu de l\'article doit contenir au moins 1 caractère',
      'any.required': 'Le contenu de l\'article est requis'
    }),
  status: Joi.string()
    .valid('draft', 'published', 'hided')
    .default('draft')
    .messages({
      'any.only': 'Le statut doit être draft, published ou hided'
    })
});

// Schéma pour la mise à jour d'un article
export const updateArticleSchema = Joi.object({
  categoryId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'L\'ID de la catégorie doit être un UUID valide'
    }),
  title: Joi.string()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Le titre de l\'article doit contenir au moins 1 caractère',
      'string.max': 'Le titre de l\'article ne peut pas dépasser 200 caractères'
    }),
  content: Joi.string()
    .min(1)
    .optional()
    .messages({
      'string.min': 'Le contenu de l\'article doit contenir au moins 1 caractère'
    }),
  status: Joi.string()
    .valid('draft', 'published', 'hided')
    .optional()
    .messages({
      'any.only': 'Le statut doit être draft, published ou hided'
    })
}).min(1).messages({
  'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});

// Schéma pour les paramètres de requête (pagination, recherche, filtres)
export const getArticlesQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'La page doit être un nombre',
      'number.integer': 'La page doit être un nombre entier',
      'number.min': 'La page doit être supérieure ou égale à 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'La limite doit être un nombre',
      'number.integer': 'La limite doit être un nombre entier',
      'number.min': 'La limite doit être supérieure ou égale à 1',
      'number.max': 'La limite ne peut pas dépasser 100'
    }),
  search: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Le terme de recherche doit contenir au moins 1 caractère',
      'string.max': 'Le terme de recherche ne peut pas dépasser 100 caractères'
    }),
  status: Joi.string()
    .valid('draft', 'published', 'hided')
    .optional()
    .messages({
      'any.only': 'Le statut doit être draft, published ou hided'
    }),
  categoryId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'L\'ID de la catégorie doit être un UUID valide'
    }),
  userId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'L\'ID de l\'utilisateur doit être un UUID valide'
    }),
  sortBy: Joi.string()
    .valid('title', 'createdAt', 'updatedAt', 'status')
    .default('createdAt')
    .messages({
      'any.only': 'Le tri doit être par title, createdAt, updatedAt ou status'
    }),
  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .default('DESC')
    .messages({
      'any.only': 'L\'ordre de tri doit être ASC ou DESC'
    })
});

// Schéma pour les paramètres d'ID
export const articleIdParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'L\'ID de l\'article doit être un UUID valide',
      'any.required': 'L\'ID de l\'article est requis'
    })
});

// Schéma pour changer le statut d'un article
export const changeArticleStatusSchema = Joi.object({
  status: Joi.string()
    .valid('draft', 'published', 'hided')
    .required()
    .messages({
      'any.only': 'Le statut doit être draft, published ou hided',
      'any.required': 'Le statut est requis'
    })
});
