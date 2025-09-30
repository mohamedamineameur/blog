import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Op } from 'sequelize';
import { env } from '../config/env';

// Interfaces pour les requêtes
export interface IReqLogin {
  email: string;
  password: string;
}

export interface IReqLogout {
  sessionId: string;
}

// Interfaces pour les réponses
export interface IResLogin {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      firstname: string;
      lastname: string;
      email: string;
      isAdmin: boolean;
      isEmailVerified: boolean;
      isBanned: boolean;
    };
    sessionId: string;
  } | null;
}

export interface IResLogout {
  success: boolean;
  message: string;
}

export interface IResSession {
  success: boolean;
  data: {
    user: {
      id: string;
      firstname: string;
      lastname: string;
      email: string;
      isAdmin: boolean;
      isEmailVerified: boolean;
      isBanned: boolean;
    };
    session: {
      id: string;
      ipAddress: string;
      userAgent: string;
      isActive: boolean;
      expiresAt: Date;
    };
  } | null;
}

// Configuration JWT
const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
const SESSION_EXPIRES_IN = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

// Générer un token JWT
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
};

// Hasher un token
const hashToken = async (token: string): Promise<string> => {
  return await bcrypt.hash(token, 12);
};

// Vérifier un token
const verifyToken = async (token: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(token, hash);
};

// Obtenir l'IP et User-Agent de la requête
const getRequestInfo = (req: Request) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  return { ipAddress, userAgent };
};

// Login
export const login = async (req: Request<object, IResLogin, IReqLogin>, res: Response<IResLogin>): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
        data: null
      });
      return;
    }

    // Vérifier si l'utilisateur est banni
    if (user.isBanned) {
      res.status(403).json({
        success: false,
        message: 'Votre compte a été suspendu',
        data: null
      });
      return;
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
        data: null
      });
      return;
    }

    // Obtenir les informations de la requête
    // Correction du typage pour éviter l'erreur de type sur req
    // On force le typage pour correspondre à ce que getRequestInfo attend
    const { ipAddress, userAgent } = getRequestInfo(req as Request);

    // Générer un nouveau token
    const token = generateToken(user.id);
    const tokenHash = await hashToken(token);

    // Calculer la date d'expiration
    const expiresAt = new Date(Date.now() + SESSION_EXPIRES_IN);

    // Vérifier s'il existe déjà une session active pour cet utilisateur avec la même IP et User-Agent
    const existingSession = await Session.findOne({
      where: {
        userId: user.id,
        ipAddress,
        userAgent,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    

    let sessionId: string;

    if (existingSession) {
      // Mettre à jour la session existante
      await existingSession.update({
        tokenHash,
        expiresAt,
        isActive: true
      });
      sessionId = existingSession.id;
    } else {
      // Créer une nouvelle session
      const newSession = await Session.create({
        userId: user.id,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt,
        isActive: true
      });
      sessionId = newSession.id;
    }

    // Retourner les données de l'utilisateur sans le mot de passe
    const userData = user.toJSON();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, otp: _otp, ...userResponse } = userData;

    // Définir les cookies
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_EXPIRES_IN
    });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_EXPIRES_IN
    });

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: userResponse,
        sessionId
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
};

// Déconnexion
export const logout = async (req: Request<object, IResLogout, IReqLogout>, res: Response<IResLogout>): Promise<void> => {
  try {
    const { sessionId } = req.body;

    // Désactiver la session
    await Session.update(
      { isActive: false },
      { where: { id: sessionId } }
    );

    // Nettoyer les cookies
    res.clearCookie('sessionId');
    res.clearCookie('token');

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Obtenir les informations de la session
export const getSession = async (req: Request, res: Response<IResSession>): Promise<void> => {
  try {
    const sessionId = req.cookies.sessionId;
    const token = req.cookies.token;

    if (!sessionId || !token) {
      res.status(401).json({
        success: false,
        data: null
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
        data: null
      });
      return;
    }

    // Vérifier si la session a expiré
    if (session.expiresAt < new Date()) {
      await session.update({ isActive: false });
      res.status(401).json({
        success: false,
        data: null
      });
      return;
    }

    // Vérifier le token
    const isTokenValid = await verifyToken(token, session.tokenHash);
    if (!isTokenValid) {
      res.status(401).json({
        success: false,
        data: null
      });
      return;
    }

    const user = (session && typeof session === 'object' && 'User' in session)
      ? (session.User as User)
      : null;

    if (!user) {
      res.status(401).json({
        success: false,
        data: null
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          isAdmin: user.isAdmin,
          isEmailVerified: user.isEmailVerified,
          isBanned: user.isBanned
        },
        session: {
          id: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          isActive: session.isActive,
          expiresAt: session.expiresAt
        }
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération de la session:', error);
    res.status(500).json({
      success: false,
      data: null
    });
  }
};
