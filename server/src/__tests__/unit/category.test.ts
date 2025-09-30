import request from 'supertest';
import app from '../../app';
import { Category } from '../../models/Category';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import { sequelize } from '../../db/sequelize';
import { initDatabase } from '../../db/sequelize';
import { 
  generateTestToken,
  hashTestToken,
  cleanupAuth
} from '../fixtures/auth.fixtures';
import { 
  userFixtures, 
  createUserInDb,
  cleanupUsers
} from '../fixtures/user.fixtures';

// Fonction de nettoyage
const cleanupCategories = async (): Promise<void> => {
  await Category.destroy({ where: {}, force: true });
};

const cleanupUsers = async (): Promise<void> => {
  await User.destroy({ where: {}, force: true });
};

const cleanupAuth = async (): Promise<void> => {
  await Session.destroy({ where: {}, force: true });
};

describe('Category CRUD Operations', () => {
  let adminUser: User;
  let regularUser: User;
  let adminToken: string;
  let adminSession: Session;
  let userToken: string;
  let userSession: Session;

  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    await cleanupCategories();
    await cleanupUsers();
    await cleanupAuth();

    // Créer un utilisateur admin
    adminUser = await createUserInDb(userFixtures.admin);
    adminToken = generateTestToken(adminUser.id);
    const adminTokenHash = await hashTestToken(adminToken);
    adminSession = await Session.create({
      userId: adminUser.id,
      tokenHash: adminTokenHash,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    // Créer un utilisateur régulier
    regularUser = await createUserInDb(userFixtures.regular);
    userToken = generateTestToken(regularUser.id);
    const userTokenHash = await hashTestToken(userToken);
    userSession = await Session.create({
      userId: regularUser.id,
      tokenHash: userTokenHash,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  });

  afterAll(async () => {
    await cleanupCategories();
    await cleanupUsers();
    await cleanupAuth();
  });

  describe('GET /api/categories', () => {
    it('should get all categories without authentication', async () => {
      // Créer quelques catégories de test
      await Category.create({
        name: 'Technology',
        description: 'Articles about technology'
      });
      await Category.create({
        name: 'Science',
        description: 'Articles about science'
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should get categories with pagination', async () => {
      // Créer plusieurs catégories
      for (let i = 1; i <= 15; i++) {
        await Category.create({
          name: `Category ${i}`,
          description: `Description for category ${i}`
        });
      }

      const response = await request(app)
        .get('/api/categories?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.total).toBe(15);
      expect(response.body.data.pagination.totalPages).toBe(3);
    });

    it('should search categories by name', async () => {
      await Category.create({
        name: 'Technology',
        description: 'Articles about technology'
      });
      await Category.create({
        name: 'Science',
        description: 'Articles about science'
      });

      const response = await request(app)
        .get('/api/categories?search=Tech')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('Technology');
    });

    it('should sort categories', async () => {
      await Category.create({
        name: 'Zebra',
        description: 'Z category'
      });
      await Category.create({
        name: 'Apple',
        description: 'A category'
      });

      const response = await request(app)
        .get('/api/categories?sortBy=name&sortOrder=ASC')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data[0].name).toBe('Apple');
      expect(response.body.data.data[1].name).toBe('Zebra');
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should get a category by ID without authentication', async () => {
      const category = await Category.create({
        name: 'Technology',
        description: 'Articles about technology'
      });

      const response = await request(app)
        .get(`/api/categories/${category.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(category.id);
      expect(response.body.data.name).toBe('Technology');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get('/api/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/categories/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/categories', () => {
    it('should create a category as admin', async () => {
      const categoryData = {
        name: 'Technology',
        description: 'Articles about technology'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Catégorie créée avec succès');
      expect(response.body.data.name).toBe('Technology');
      expect(response.body.data.description).toBe('Articles about technology');
    });

    it('should deny access to regular user', async () => {
      const categoryData = {
        name: 'Technology',
        description: 'Articles about technology'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(categoryData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Accès refusé : privilèges administrateur requis');
    });

    it('should deny access without authentication', async () => {
      const categoryData = {
        name: 'Technology',
        description: 'Articles about technology'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate category name', async () => {
      await Category.create({
        name: 'Technology',
        description: 'Articles about technology'
      });

      const categoryData = {
        name: 'Technology',
        description: 'Another description'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(categoryData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Une catégorie avec ce nom existe déjà');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/categories/:id', () => {
    let category: Category;

    beforeEach(async () => {
      category = await Category.create({
        name: 'Technology',
        description: 'Articles about technology'
      });
    });

    it('should update a category as admin', async () => {
      const updateData = {
        name: 'Updated Technology',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Catégorie mise à jour avec succès');
      expect(response.body.data.name).toBe('Updated Technology');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should deny access to regular user', async () => {
      const updateData = {
        name: 'Updated Technology',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Accès refusé : privilèges administrateur requis');
    });

    it('should deny access without authentication', async () => {
      const updateData = {
        name: 'Updated Technology',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent category', async () => {
      const updateData = {
        name: 'Updated Technology',
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/api/categories/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Catégorie non trouvée');
    });

    it('should return 409 for duplicate category name', async () => {
      await Category.create({
        name: 'Science',
        description: 'Articles about science'
      });

      const updateData = {
        name: 'Science',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Une catégorie avec ce nom existe déjà');
    });

    it('should validate at least one field for update', async () => {
      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
