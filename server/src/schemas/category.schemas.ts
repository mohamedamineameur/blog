import Joi from 'joi';

// Schéma pour la création d'une catégorie
export const createCategorySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Le nom de la catégorie est requis',
      'string.min': 'Le nom de la catégorie doit contenir au moins 1 caractère',
      'string.max': 'Le nom de la catégorie ne peut pas dépasser 100 caractères',
      'any.required': 'Le nom de la catégorie est requis'
    }),
  description: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.empty': 'La description de la catégorie est requise',
      'string.min': 'La description de la catégorie doit contenir au moins 1 caractère',
      'any.required': 'La description de la catégorie est requise'
    })
});

// Schéma pour la mise à jour d'une catégorie
export const updateCategorySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Le nom de la catégorie doit contenir au moins 1 caractère',
      'string.max': 'Le nom de la catégorie ne peut pas dépasser 100 caractères'
    }),
  description: Joi.string()
    .min(1)
    .optional()
    .messages({
      'string.min': 'La description de la catégorie doit contenir au moins 1 caractère'
    })
}).min(1).messages({
  'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});

// Schéma pour les paramètres de requête (pagination, recherche)
export const getCategoriesQuerySchema = Joi.object({
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
  sortBy: Joi.string()
    .valid('name', 'createdAt', 'updatedAt')
    .default('createdAt')
    .messages({
      'any.only': 'Le tri doit être par name, createdAt ou updatedAt'
    }),
  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .default('ASC')
    .messages({
      'any.only': 'L\'ordre de tri doit être ASC ou DESC'
    })
});

// Schéma pour les paramètres d'ID
export const categoryIdParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'L\'ID de la catégorie doit être un UUID valide',
      'any.required': 'L\'ID de la catégorie est requis'
    })
});
