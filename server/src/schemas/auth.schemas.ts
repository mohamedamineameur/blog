import Joi from 'joi';

// Schéma pour la connexion
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'L\'email doit être valide',
      'any.required': 'L\'email est requis'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Le mot de passe est requis'
    })
});

// Schéma pour la déconnexion
export const logoutSchema = Joi.object({
  sessionId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'L\'ID de session doit être un UUID valide',
      'any.required': 'L\'ID de session est requis'
    })
});

