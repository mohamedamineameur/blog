import Joi from 'joi';

// Schéma pour la création d'un commentaire
export const createCommentArticleSchema = Joi.object({
  articleId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'L\'ID de l\'article doit être un UUID valide',
      'any.required': 'L\'ID de l\'article est requis'
    }),
  content: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Le contenu doit contenir au moins 1 caractère',
      'string.max': 'Le contenu ne peut pas dépasser 2000 caractères',
      'any.required': 'Le contenu est requis'
    }),
  parentId: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'L\'ID du commentaire parent doit être un UUID valide'
    })
});

// Schéma pour la mise à jour d'un commentaire
export const updateCommentArticleSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Le contenu doit contenir au moins 1 caractère',
      'string.max': 'Le contenu ne peut pas dépasser 2000 caractères',
      'any.required': 'Le contenu est requis'
    })
});

// Schéma pour l'approbation d'un commentaire
export const approveCommentArticleSchema = Joi.object({
  isApproved: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Le statut d\'approbation est requis'
    })
});

// Schéma pour les paramètres de requête (pagination, recherche, filtres)
export const getCommentArticlesQuerySchema = Joi.object({
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
  parentId: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'L\'ID du commentaire parent doit être un UUID valide'
    }),
  isApproved: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Le statut d\'approbation doit être un booléen'
    }),
  includeReplies: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'includeReplies doit être un booléen'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'content')
    .default('createdAt')
    .messages({
      'any.only': 'Le tri doit être par createdAt, updatedAt ou content'
    }),
  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .default('DESC')
    .messages({
      'any.only': 'L\'ordre de tri doit être ASC ou DESC'
    })
});

// Schéma pour les paramètres d'ID
export const commentArticleIdParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'L\'ID du commentaire doit être un UUID valide',
      'any.required': 'L\'ID du commentaire est requis'
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
