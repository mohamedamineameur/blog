import Joi from 'joi';
import JoiPasswordComplexity from 'joi-password-complexity';

// Schéma pour la création d'utilisateur
export const createUserSchema = Joi.object({
  firstname: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Le prénom doit contenir au moins 2 caractères',
      'string.max': 'Le prénom ne peut pas dépasser 50 caractères',
      'any.required': 'Le prénom est requis'
    }),
  
  lastname: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Le nom doit contenir au moins 2 caractères',
      'string.max': 'Le nom ne peut pas dépasser 50 caractères',
      'any.required': 'Le nom est requis'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'L\'email doit être valide',
      'any.required': 'L\'email est requis'
    }),
  
  password: JoiPasswordComplexity({
    min: 8,
    max: 128,
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    symbol: 1,
    requirementCount: 4
  }).required().messages({
    'passwordComplexity.tooShort': 'Le mot de passe doit contenir au moins 8 caractères',
    'passwordComplexity.tooLong': 'Le mot de passe ne peut pas dépasser 128 caractères',
    'passwordComplexity.lowercase': 'Le mot de passe doit contenir au moins une lettre minuscule',
    'passwordComplexity.uppercase': 'Le mot de passe doit contenir au moins une lettre majuscule',
    'passwordComplexity.numeric': 'Le mot de passe doit contenir au moins un chiffre',
    'passwordComplexity.symbol': 'Le mot de passe doit contenir au moins un symbole',
    'any.required': 'Le mot de passe est requis'
  }),
  
  isAdmin: Joi.boolean().optional().default(false),
  isEmailVerified: Joi.boolean().optional().default(false),
  isBanned: Joi.boolean().optional().default(false)
});

// Schéma pour la mise à jour d'utilisateur
export const updateUserSchema = Joi.object({
  firstname: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Le prénom doit contenir au moins 2 caractères',
      'string.max': 'Le prénom ne peut pas dépasser 50 caractères'
    }),
  
  lastname: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Le nom doit contenir au moins 2 caractères',
      'string.max': 'Le nom ne peut pas dépasser 50 caractères'
    }),
  
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'L\'email doit être valide'
    }),
  
  password: JoiPasswordComplexity({
    min: 8,
    max: 128,
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    symbol: 1,
    requirementCount: 4
  }).optional().messages({
    'passwordComplexity.tooShort': 'Le mot de passe doit contenir au moins 8 caractères',
    'passwordComplexity.tooLong': 'Le mot de passe ne peut pas dépasser 128 caractères',
    'passwordComplexity.lowercase': 'Le mot de passe doit contenir au moins une lettre minuscule',
    'passwordComplexity.uppercase': 'Le mot de passe doit contenir au moins une lettre majuscule',
    'passwordComplexity.numeric': 'Le mot de passe doit contenir au moins un chiffre',
    'passwordComplexity.symbol': 'Le mot de passe doit contenir au moins un symbole'
  }),
  
  isAdmin: Joi.boolean().optional(),
  isEmailVerified: Joi.boolean().optional(),
  isBanned: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});

// Schéma pour la validation d'email
export const verifyEmailSchema = Joi.object({
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'L\'OTP doit contenir exactement 6 chiffres',
      'string.pattern.base': 'L\'OTP doit contenir uniquement des chiffres',
      'any.required': 'L\'OTP est requis'
    })
});

// Schéma pour le changement de mot de passe
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Le mot de passe actuel est requis'
  }),
  
  newPassword: JoiPasswordComplexity({
    min: 8,
    max: 128,
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    symbol: 1,
    requirementCount: 4
  }).required().messages({
    'passwordComplexity.tooShort': 'Le nouveau mot de passe doit contenir au moins 8 caractères',
    'passwordComplexity.tooLong': 'Le nouveau mot de passe ne peut pas dépasser 128 caractères',
    'passwordComplexity.lowercase': 'Le nouveau mot de passe doit contenir au moins une lettre minuscule',
    'passwordComplexity.uppercase': 'Le nouveau mot de passe doit contenir au moins une lettre majuscule',
    'passwordComplexity.numeric': 'Le nouveau mot de passe doit contenir au moins un chiffre',
    'passwordComplexity.symbol': 'Le nouveau mot de passe doit contenir au moins un symbole',
    'any.required': 'Le nouveau mot de passe est requis'
  })
});

// Schéma pour les paramètres de requête (pagination, filtres)
export const getUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional(),
  isAdmin: Joi.boolean().optional(),
  isEmailVerified: Joi.boolean().optional(),
  isBanned: Joi.boolean().optional(),
  sortBy: Joi.string().valid('firstname', 'lastname', 'email', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
});

// Schéma pour l'ID utilisateur dans les paramètres
export const userIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'L\'ID utilisateur doit être un UUID valide',
    'any.required': 'L\'ID utilisateur est requis'
  })
});
