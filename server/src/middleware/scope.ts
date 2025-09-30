import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

// Interface pour les requêtes avec utilisateur authentifié
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Middleware pour vérifier que l'utilisateur peut accéder à ses propres données
export const userScope = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
      return;
    }

    // Récupérer l'ID de l'utilisateur depuis les paramètres de la route
    const requestedUserId = req.params.id;
    const authenticatedUserId = req.user.id;

    // Vérifier que l'utilisateur essaie d'accéder à ses propres données
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      res.status(403).json({
        success: false,
        message: 'Accès refusé : vous ne pouvez accéder qu\'à vos propres données'
      });
      return;
    }

    // Si pas d'ID spécifique dans les paramètres, l'utilisateur accède à ses propres données
    next();
  } catch (error) {
    console.error('Erreur dans le middleware de scope:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Middleware pour vérifier que l'utilisateur est admin (accès à toutes les données)
export const adminScope = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
      return;
    }

    // Vérifier que l'utilisateur est admin
    if (!req.user.isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Accès refusé : privilèges administrateur requis'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Erreur dans le middleware admin scope:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Middleware pour vérifier que l'utilisateur peut accéder à ses propres données OU est admin
export const userOrAdminScope = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
      return;
    }

    // Si l'utilisateur est admin, il peut accéder à tout
    if (req.user.isAdmin) {
      next();
      return;
    }

    // Sinon, vérifier qu'il accède à ses propres données
    const requestedUserId = req.params.id;
    const authenticatedUserId = req.user.id;

    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      res.status(403).json({
        success: false,
        message: 'Accès refusé : vous ne pouvez accéder qu\'à vos propres données'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Erreur dans le middleware userOrAdminScope:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Middleware pour forcer l'utilisateur à accéder à ses propres données (ignore les paramètres)
export const forceUserScope = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
      return;
    }

    // Forcer l'ID de l'utilisateur dans les paramètres
    req.params.id = req.user.id;
    next();
  } catch (error) {
    console.error('Erreur dans le middleware forceUserScope:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Middleware spécial pour les routes /me (utilisateur connecté seulement)
export const meScope = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
      return;
    }

    // L'utilisateur accède automatiquement à ses propres données
    // Pas besoin de vérifier l'ID car c'est implicite
    next();
  } catch (error) {
    console.error('Erreur dans le middleware meScope:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};
