import { Sequelize } from 'sequelize';
import { env } from '../config/env';
import { initUserModel } from '../models/User';
import { initSessionModel } from '../models/Session';
import { initCategoryModel } from '../models/Category';

// Configuration pour les tests (mémoire) vs production (fichier)
const isTest = env.NODE_ENV === 'test';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: isTest ? ':memory:' : env.DB_STORAGE,
  logging: env.NODE_ENV === "development" ? console.log : false,
});

export async function initDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    initUserModel(sequelize);
    initSessionModel(sequelize);
    initCategoryModel(sequelize);
    await sequelize.sync();
    console.log("Database connected and synchronized");
  } catch (error) {
    console.error("Database initialization failed", error);
    process.exit(1);
  }
}
