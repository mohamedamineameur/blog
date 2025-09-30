import { User } from '../../models/User';
import bcrypt from 'bcryptjs';


// Fixtures pour les utilisateurs de test
export const userFixtures = {
  // Utilisateur admin
  admin: {
    firstname: 'Admin',
    lastname: 'User',
    email: 'admin@example.com',
    password: 'AdminPass123!',
    isAdmin: true,
    isEmailVerified: true,
    isBanned: false
  },

  // Utilisateur normal
  regular: {
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@example.com',
    password: 'UserPass123!',
    isAdmin: false,
    isEmailVerified: true,
    isBanned: false
  },

  // Utilisateur non vérifié
  unverified: {
    firstname: 'Jane',
    lastname: 'Smith',
    email: 'jane.smith@example.com',
    password: 'UserPass123!',
    isAdmin: false,
    isEmailVerified: false,
    isBanned: false
  },

  // Utilisateur banni
  banned: {
    firstname: 'Banned',
    lastname: 'User',
    email: 'banned@example.com',
    password: 'UserPass123!',
    isAdmin: false,
    isEmailVerified: true,
    isBanned: true
  },

  // Utilisateur avec OTP
  withOtp: {
    firstname: 'OTP',
    lastname: 'User',
    email: 'otp@example.com',
    password: 'UserPass123!',
    isAdmin: false,
    isEmailVerified: false,
    isBanned: false,
    otp: '123456'
  },
  duplicate: {
    firstname: 'Duplicate',
    lastname: 'User',
    email: 'test@example.com', // Email déjà utilisé par testUserData.valid
    password: 'TestPass123!',
    isAdmin: false,
    isEmailVerified: false,
    isBanned: false,
    otp: '123456'
  }
};

// Fonction pour créer un utilisateur en base avec mot de passe hashé
export const createUserInDb = async (userData: typeof userFixtures.admin) => {
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
  
  return await User.create({
    ...userData,
    password: hashedPassword
  });
};

// Fonction pour créer plusieurs utilisateurs
export const createMultipleUsers = async () => {
  const users = [];
  
  // Créer des utilisateurs avec des emails uniques basés sur timestamp
  const timestamp = Date.now();
  const uniqueFixtures = {
    admin: { ...userFixtures.admin, email: `admin${timestamp}@example.com` },
    regular: { ...userFixtures.regular, email: `regular${timestamp}@example.com` },
    unverified: { ...userFixtures.unverified, email: `unverified${timestamp}@example.com` },
    banned: { ...userFixtures.banned, email: `banned${timestamp}@example.com` },
    withOtp: { ...userFixtures.withOtp, email: `otp${timestamp}@example.com` }
  };
  
  for (const [key, userData] of Object.entries(uniqueFixtures)) {
    const user = await createUserInDb(userData);
    users.push({ key, user });
  }
  
  return users;
};

// Fonction pour nettoyer tous les utilisateurs
export const cleanupUsers = async () => {
  await User.destroy({ where: {}, force: true });
};

// Données de test pour les requêtes
export const testUserData = {
  valid: {
    firstname: 'Test',
    lastname: 'User',
    email: 'test@example.com',
    password: 'TestPass123!'
  },
  
  invalid: {
    firstname: 'T', // Trop court
    lastname: 'U', // Trop court
    email: 'invalid-email', // Email invalide
    password: '123' // Mot de passe trop simple
  },
  
  duplicate: {
    firstname: 'Duplicate',
    lastname: 'User',
    email: 'test@example.com', // Email déjà utilisé par testUserData.valid
    password: 'TestPass123!'
  }
};

// Données pour les mises à jour
export const updateUserData = {
  valid: {
    firstname: 'Updated',
    lastname: 'User'
  },
  
  email: {
    email: 'updated@example.com'
  },
  
  password: {
    currentPassword: 'TestPass123!',
    newPassword: 'NewPass123!'
  },
  
  admin: {
    isAdmin: true
  },
  
  ban: {
    isBanned: true
  }
};

// Données pour la pagination
export const paginationData = {
  page1: { page: 1, limit: 2 },
  page2: { page: 2, limit: 2 },
  search: { search: 'John' },
  filterAdmin: { isAdmin: true },
  filterVerified: { isEmailVerified: true },
  filterBanned: { isBanned: true },
  sort: { sortBy: 'createdAt', sortOrder: 'ASC' }
};
