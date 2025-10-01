// Configuration TypeScript pour les tests
import { initDatabase } from '../db/sequelize';

// Configuration pour les tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.CORS_ORIGIN = '*';
process.env.DB_STORAGE = ':memory:';

// Initialiser la base de données pour les tests
beforeAll(async () => {
  await initDatabase();
});

// Nettoyer après chaque test (sauf pour les tests d'intégration)
afterEach(async () => {
  // Vérifier si c'est un test d'intégration
  const isIntegrationTest = expect.getState().testPath?.includes('integration');
  
  if (!isIntegrationTest) {
    const { sequelize } = await import('../db/sequelize');
    await sequelize.truncate({ cascade: true });
  }
});

// Fermer la connexion après tous les tests
afterAll(async () => {
  const { sequelize } = await import('../db/sequelize');
  await sequelize.close();
});
