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

describe('Category Integration Tests', () => {
  let adminUser: User;
  let adminToken: string;
  let adminSession: Session;

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
  });

  afterAll(async () => {
    await cleanupCategories();
    await cleanupUsers();
    await cleanupAuth();
  });

  describe('Complete Category Workflow', () => {
    it('should handle complete category lifecycle', async () => {
      // 1. Créer une catégorie
      const createResponse = await request(app)
        .post('/api/categories')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          name: 'Technology',
          description: 'Articles about technology and innovation'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe('Technology');
      const categoryId = createResponse.body.data.id;

      // 2. Récupérer la catégorie créée
      const getResponse = await request(app)
        .get(`/api/categories/${categoryId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(categoryId);
      expect(getResponse.body.data.name).toBe('Technology');

      // 3. Lister toutes les catégories
      const listResponse = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.data).toHaveLength(1);
      expect(listResponse.body.data.data[0].name).toBe('Technology');

      // 4. Mettre à jour la catégorie
      const updateResponse = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          name: 'Advanced Technology',
          description: 'Articles about cutting-edge technology'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe('Advanced Technology');
      expect(updateResponse.body.data.description).toBe('Articles about cutting-edge technology');

      // 5. Vérifier que la catégorie a été mise à jour
      const updatedGetResponse = await request(app)
        .get(`/api/categories/${categoryId}`)
        .expect(200);

      expect(updatedGetResponse.body.success).toBe(true);
      expect(updatedGetResponse.body.data.name).toBe('Advanced Technology');
    }, 30000);

    it('should handle multiple categories with search and pagination', async () => {
      // Créer plusieurs catégories
      const categories = [
        { name: 'Technology', description: 'Tech articles' },
        { name: 'Science', description: 'Science articles' },
        { name: 'Art', description: 'Art articles' },
        { name: 'Sports', description: 'Sports articles' },
        { name: 'Music', description: 'Music articles' }
      ];

      for (const categoryData of categories) {
        await request(app)
          .post('/api/categories')
          .set('Cookie', [
            `sessionId=${adminSession.id}`,
            `token=${adminToken}`
          ])
          .send(categoryData)
          .expect(201);
      }

      // Tester la pagination
      const page1Response = await request(app)
        .get('/api/categories?page=1&limit=2')
        .expect(200);

      expect(page1Response.body.success).toBe(true);
      expect(page1Response.body.data.data).toHaveLength(2);
      expect(page1Response.body.data.pagination.total).toBe(5);
      expect(page1Response.body.data.pagination.totalPages).toBe(3);

      // Tester la recherche
      const searchResponse = await request(app)
        .get('/api/categories?search=Tech')
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.data).toHaveLength(1);
      expect(searchResponse.body.data.data[0].name).toBe('Technology');

      // Tester le tri
      const sortedResponse = await request(app)
        .get('/api/categories?sortBy=name&sortOrder=ASC')
        .expect(200);

      expect(sortedResponse.body.success).toBe(true);
      expect(sortedResponse.body.data.data[0].name).toBe('Art');
      expect(sortedResponse.body.data.data[1].name).toBe('Music');
    }, 30000);

    it('should handle category name conflicts', async () => {
      // Créer une première catégorie
      const firstCategory = await request(app)
        .post('/api/categories')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          name: 'Technology',
          description: 'First description'
        })
        .expect(201);

      // Essayer de créer une catégorie avec le même nom
      const duplicateResponse = await request(app)
        .post('/api/categories')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          name: 'Technology',
          description: 'Second description'
        })
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.message).toBe('Une catégorie avec ce nom existe déjà');

      // Mettre à jour la première catégorie avec un nom qui existe déjà
      const updateConflictResponse = await request(app)
        .put(`/api/categories/${firstCategory.body.data.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          name: 'Technology', // Même nom que lui-même (devrait fonctionner)
          description: 'Updated description'
        })
        .expect(200);

      expect(updateConflictResponse.body.success).toBe(true);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid category ID', async () => {
      const response = await request(app)
        .get('/api/categories/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent category', async () => {
      const response = await request(app)
        .get('/api/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
    });

    it('should handle unauthorized access to protected routes', async () => {
      // Essayer de créer une catégorie sans authentification
      const createResponse = await request(app)
        .post('/api/categories')
        .send({
          name: 'Technology',
          description: 'Articles about technology'
        })
        .expect(401);

      expect(createResponse.body.success).toBe(false);

      // Essayer de mettre à jour une catégorie sans authentification
      const updateResponse = await request(app)
        .put('/api/categories/00000000-0000-0000-0000-000000000000')
        .send({
          name: 'Updated Technology',
          description: 'Updated description'
        })
        .expect(401);

      expect(updateResponse.body.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      // Créer une catégorie avec des données invalides
      const invalidResponse = await request(app)
        .post('/api/categories')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          name: '', // Nom vide
          description: '' // Description vide
        })
        .expect(400);

      expect(invalidResponse.body.success).toBe(false);

      // Mettre à jour avec des données invalides
      const category = await Category.create({
        name: 'Test Category',
        description: 'Test description'
      });

      const invalidUpdateResponse = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          name: '', // Nom vide
          description: '' // Description vide
        })
        .expect(400);

      expect(invalidUpdateResponse.body.success).toBe(false);
    });
  });
});
