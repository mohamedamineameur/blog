
import { Session, SessionCreationAttributes } from '../../models/Session';
import { User } from '../../models/User';
import bcrypt from 'bcryptjs';

// Fixtures pour les sessions de test
export const sessionFixtures = {
  valid: {
    userId: '', // Sera rempli dynamiquement
    tokenHash: '',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    isActive: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures
  },
  
  expired: {
    userId: '', // Sera rempli dynamiquement
    tokenHash: '',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    isActive: true,
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expiré
  },
  
  inactive: {
    userId: '', // Sera rempli dynamiquement
    tokenHash: '',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    isActive: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
};

// Données de test pour les requêtes d'authentification
export const authTestData = {
  validLogin: {
    email: 'admin@example.com',
    password: 'AdminPass123!'
  },
  
  invalidEmail: {
    email: 'nonexistent@example.com',
    password: 'AdminPass123!'
  },
  
  invalidPassword: {
    email: 'admin@example.com',
    password: 'WrongPassword123!'
  },
  
  bannedUser: {
    email: 'banned@example.com',
    password: 'UserPass123!'
  },
  
  invalidFormat: {
    email: 'invalid-email',
    password: '123'
  }
};

// Données pour les tests de session
export const sessionTestData = {
  validSession: {
    sessionId: '', // Sera rempli dynamiquement
    token: '' // Sera rempli dynamiquement
  },
  
  invalidSession: {
    sessionId: '00000000-0000-0000-0000-000000000000',
    token: 'invalid-token'
  },
  
  expiredSession: {
    sessionId: '', // Sera rempli dynamiquement
    token: '' // Sera rempli dynamiquement
  }
};

// Fonction pour créer une session en base de données
export const createSessionInDb = async (sessionData: SessionCreationAttributes, token?: string) => {
  let tokenHash = sessionData.tokenHash;
  
  // Si un token est fourni, le hasher
  if (token && !tokenHash) {
    tokenHash = await bcrypt.hash(token, 12);
  }
  
  return await Session.create({
    ...sessionData,
    tokenHash
  });
};

// Fonction pour créer un utilisateur avec session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createUserWithSession = async (userData: any, sessionData: any, token?: string) => {
  // Créer l'utilisateur
  const user = await User.create(userData);
  
  // Créer la session
  const session = await createSessionInDb({
    ...sessionData,
    userId: user.id
  }, token);
  
  return { user, session };
};

// Fonction pour nettoyer toutes les sessions
export const cleanupSessions = async () => {
  await Session.destroy({ where: {}, force: true });
};

// Fonction pour nettoyer les sessions et utilisateurs
export const cleanupAuth = async () => {
  await Session.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
};

// Fonction pour générer un token de test
export const generateTestToken = (userId: string): string => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
};

// Fonction pour hasher un token
export const hashTestToken = async (token: string): Promise<string> => {
  return await bcrypt.hash(token, 12);
};
