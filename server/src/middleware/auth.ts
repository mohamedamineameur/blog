import { Request, Response, NextFunction } from 'express';
import { Session } from '../models/Session';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

// Interface pour étendre Request avec les données d'authentification
export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: {
    id: string;
    ipAddress: string;
    userAgent: string;
    isActive: boolean;
    expiresAt: Date;
  };
}

// Vérifier un token
const verifyToken = async (token: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(token, hash);
};

// Middleware d'authentification
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = req.cookies.sessionId;
    const token = req.cookies.token;

    if (!sessionId || !token) {
      res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
      return;
    }

    // Trouver la session
    const session = await Session.findOne({
      where: { id: sessionId, isActive: true },
      include: [{ model: User, as: 'User', attributes: { exclude: ['password', 'otp'] } }]
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Session invalide'
      });
      return;
    }

    // Vérifier si la session a expiré
    if (session.expiresAt < new Date()) {
      await session.update({ isActive: false });
      res.status(401).json({
        success: false,
        message: 'Session expirée'
      });
      return;
    }

    // Vérifier le token
    const isTokenValid = await verifyToken(token, session.tokenHash);
    if (!isTokenValid) {
      res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
      return;
    }

    // Vérifier si l'utilisateur est banni
    const user = (session as unknown as { User: User }).User;
    if (!user || user.isBanned) {
      res.status(403).json({
        success: false,
        message: 'Votre compte a été suspendu'
      });
      return;
    }

    // Ajouter l'utilisateur complet à la requête
    req.user = user;

    req.session = {
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isActive: session.isActive,
      expiresAt: session.expiresAt
    };

    next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de l\'authentification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Middleware pour vérifier si l'utilisateur est admin
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({
      success: false,
      message: 'Droits administrateur requis'
    });
    return;
  }

  next();
};

// Middleware pour vérifier si l'email est vérifié
export const requireEmailVerified = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
    return;
  }

  if (!req.user.isEmailVerified) {
    res.status(403).json({
      success: false,
      message: 'Email non vérifié'
    });
    return;
  }

  next();
};
