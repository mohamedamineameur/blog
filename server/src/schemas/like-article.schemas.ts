import Joi from 'joi';

// Schéma pour la création d'un like
export const createLikeArticleSchema = Joi.object({
  articleId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'L\'ID de l\'article doit être un UUID valide',
      'any.required': 'L\'ID de l\'article est requis'
    }),
  type: Joi.string()
    .valid('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry')
    .required()
    .messages({
      'any.only': 'Le type doit être like, love, care, haha, wow, sad ou angry',
      'any.required': 'Le type est requis'
    })
});

// Schéma pour la mise à jour d'un like
export const updateLikeArticleSchema = Joi.object({
  type: Joi.string()
    .valid('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry')
    .required()
    .messages({
      'any.only': 'Le type doit être like, love, care, haha, wow, sad ou angry',
      'any.required': 'Le type est requis'
    })
});

// Schéma pour les paramètres de requête (pagination, recherche, filtres)
export const getLikeArticlesQuerySchema = Joi.object({
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
  type: Joi.string()
    .valid('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry')
    .optional()
    .messages({
      'any.only': 'Le type doit être like, love, care, haha, wow, sad ou angry'
    }),
  articleId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'L\'ID de l\'article doit être un UUID valide'
    }),
  userId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'L\'ID de l\'utilisateur doit être un UUID valide'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'type')
    .default('createdAt')
    .messages({
      'any.only': 'Le tri doit être par createdAt, updatedAt ou type'
    }),
  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .default('DESC')
    .messages({
      'any.only': 'L\'ordre de tri doit être ASC ou DESC'
    })
});

// Schéma pour les paramètres d'ID
export const likeArticleIdParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'L\'ID du like doit être un UUID valide',
      'any.required': 'L\'ID du like est requis'
    })
});

// Schéma pour les paramètres d'ID d'article
export const articleIdParamSchema = Joi.object({
  articleId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'L\'ID de l\'article doit être un UUID valide',
      'any.required': 'L\'ID de l\'article est requis'
    })
});
