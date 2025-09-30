import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Interface pour les erreurs de validation
interface ValidationError {
  field: string;
  message: string;
}

// Middleware de validation générique
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[property];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: validationErrors
      });
      return;
    }

    // Attacher les données validées à la requête pour les contrôleurs
    if (property === 'body') {
      req.body = value;
    } else if (property === 'query') {
      // Pour les query parameters, nous ne pouvons pas modifier req.query directement
      // Les contrôleurs devront utiliser les valeurs validées
      (req as any).validatedQuery = value;
    } else if (property === 'params') {
      req.params = value;
    }
    next();
  };
};

// Middleware pour gérer les erreurs asynchrones
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware global de gestion d'erreurs
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Erreur:', error);

  // Erreur de validation Sequelize
  if (error.name === 'SequelizeValidationError') {
    const validationErrors: ValidationError[] = (error as any).errors.map((err: any) => ({
      field: err.path,
      message: err.message
    }));

    res.status(400).json({
      success: false,
      message: 'Erreurs de validation de base de données',
      errors: validationErrors
    });
    return;
  }

  // Erreur de contrainte unique Sequelize
  if (error.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({
      success: false,
      message: 'Cette ressource existe déjà'
    });
    return;
  }

  // Erreur par défaut
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
};
