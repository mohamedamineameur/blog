import request from 'supertest';
import app from '../../app';
import { LikeArticle } from '../../models/LikeArticle';
import { Article } from '../../models/Article';
import { Category } from '../../models/Category';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
// import { sequelize } from '../../db/sequelize'; // Unused import
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
const cleanupLikeArticles = async (): Promise<void> => {
  await LikeArticle.destroy({ where: {}, force: true });
};

const cleanupArticles = async (): Promise<void> => {
  await Article.destroy({ where: {}, force: true });
};

const cleanupCategories = async (): Promise<void> => {
  await Category.destroy({ where: {}, force: true });
};

describe('LikeArticle Integration Tests', () => {
  let adminUser: User;
  let regularUser: User;
  let adminToken: string;
  let adminSession: Session;
  let userToken: string;
  let userSession: Session;
  let category: Category;
  let article: Article;

  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    await cleanupLikeArticles();
    await cleanupArticles();
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

    // Créer une catégorie
    category = await Category.create({
      name: 'Technology',
      description: 'Articles about technology'
    });

    // Créer un article
    article = await Article.create({
      userId: regularUser.id,
      categoryId: category.id,
      title: 'Test Article',
      content: 'Test content',
      status: 'published'
    });
  });

  afterAll(async () => {
    await cleanupLikeArticles();
    await cleanupArticles();
    await cleanupCategories();
    await cleanupUsers();
    await cleanupAuth();
  });

  describe('Complete LikeArticle Workflow', () => {
    it('should handle complete like lifecycle', async () => {
      // 1. Créer un like
      const createResponse = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: article.id,
          type: 'like'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.type).toBe('like');
      const likeId = createResponse.body.data.id;

      // 2. Récupérer le like créé
      const getResponse = await request(app)
        .get(`/api/like-articles/${likeId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(likeId);
      expect(getResponse.body.data.type).toBe('like');

      // 3. Lister tous les likes
      const listResponse = await request(app)
        .get('/api/like-articles')
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.data).toHaveLength(1);
      expect(listResponse.body.data.data[0].type).toBe('like');

      // 4. Mettre à jour le like
      const updateResponse = await request(app)
        .put(`/api/like-articles/${likeId}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          type: 'love'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.type).toBe('love');

      // 5. Vérifier que le like a été mis à jour
      const updatedGetResponse = await request(app)
        .get(`/api/like-articles/${likeId}`)
        .expect(200);

      expect(updatedGetResponse.body.success).toBe(true);
      expect(updatedGetResponse.body.data.type).toBe('love');

      // 6. Supprimer le like
      const deleteResponse = await request(app)
        .delete(`/api/like-articles/${likeId}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Like supprimé avec succès');

      // 7. Vérifier que le like a été supprimé
      const deletedGetResponse = await request(app)
        .get(`/api/like-articles/${likeId}`)
        .expect(404);

      expect(deletedGetResponse.body.success).toBe(false);
    }, 30000);

    it('should handle multiple likes with different types', async () => {
      // Créer plusieurs utilisateurs et likes avec différents types
      const likeTypes = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

      for (let i = 0; i < likeTypes.length; i++) {
        const testUser = await createUserInDb({
          firstname: `Test${i}`,
          lastname: `User${i}`,
          email: `test${i}@example.com`,
          password: 'password123',
          isAdmin: false,
          isEmailVerified: true,
          isBanned: false
        });
        const testToken = generateTestToken(testUser.id);
        const testTokenHash = await hashTestToken(testToken);
        const testSession = await Session.create({
          userId: testUser.id,
          tokenHash: testTokenHash,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        await request(app)
          .post('/api/like-articles')
          .set('Cookie', [
            `sessionId=${testSession.id}`,
            `token=${testToken}`
          ])
          .send({
            articleId: article.id,
            type: likeTypes[i] as 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry'
          })
          .expect(201);
      }

      // Tester la pagination
      const page1Response = await request(app)
        .get('/api/like-articles?page=1&limit=3')
        .expect(200);

      expect(page1Response.body.success).toBe(true);
      expect(page1Response.body.data.data).toHaveLength(3);
      expect(page1Response.body.data.pagination.total).toBe(7);
      expect(page1Response.body.data.pagination.totalPages).toBe(3);

      // Tester le filtrage par type
      const likeResponse = await request(app)
        .get('/api/like-articles?type=like')
        .expect(200);

      expect(likeResponse.body.success).toBe(true);
      expect(likeResponse.body.data.data).toHaveLength(1);
      expect(likeResponse.body.data.data[0].type).toBe('like');

      // Tester le tri
      const sortedResponse = await request(app)
        .get('/api/like-articles?sortBy=type&sortOrder=ASC')
        .expect(200);

      expect(sortedResponse.body.success).toBe(true);
      const types = sortedResponse.body.data.data.map((like: { type: string }) => like.type);
      expect(types).toEqual(['angry', 'care', 'haha', 'like', 'love', 'sad', 'wow']);
    }, 30000);

    it('should handle like statistics correctly', async () => {
      // Créer des likes de différents types avec différents utilisateurs
      const likeData = [
        { type: 'like', count: 3 },
        { type: 'love', count: 2 },
        { type: 'haha', count: 1 },
        { type: 'wow', count: 1 }
      ];

      for (const { type, count } of likeData) {
        for (let i = 0; i < count; i++) {
          const testUser = await createUserInDb({
            firstname: `Test${type}${i}`,
            lastname: `User${type}${i}`,
            email: `test${type}${i}@example.com`,
            password: 'password123',
            isAdmin: false,
            isEmailVerified: true,
            isBanned: false
          });
          const testToken = generateTestToken(testUser.id);
          const testTokenHash = await hashTestToken(testToken);
          const testSession = await Session.create({
            userId: testUser.id,
            tokenHash: testTokenHash,
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 (Test Browser)',
            isActive: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });

          await request(app)
            .post('/api/like-articles')
            .set('Cookie', [
              `sessionId=${testSession.id}`,
              `token=${testToken}`
            ])
            .send({
              articleId: article.id,
              type: type as 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry'
            })
            .expect(201);
        }
      }

      // Obtenir les statistiques
      const statsResponse = await request(app)
        .get(`/api/like-articles/stats/${article.id}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.articleId).toBe(article.id);
      expect(statsResponse.body.data.stats.like).toBe(3);
      expect(statsResponse.body.data.stats.love).toBe(2);
      expect(statsResponse.body.data.stats.haha).toBe(1);
      expect(statsResponse.body.data.stats.wow).toBe(1);
      expect(statsResponse.body.data.stats.total).toBe(7);
    }, 30000);

    it('should handle admin permissions correctly', async () => {
      // Créer un like en tant qu'utilisateur régulier
      const createResponse = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: article.id,
          type: 'like'
        })
        .expect(201);

      const likeId = createResponse.body.data.id;

      // Admin peut modifier le like d'un autre utilisateur
      const adminUpdateResponse = await request(app)
        .put(`/api/like-articles/${likeId}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          type: 'love'
        })
        .expect(200);

      expect(adminUpdateResponse.body.success).toBe(true);
      expect(adminUpdateResponse.body.data.type).toBe('love');

      // Admin peut supprimer le like
      const adminDeleteResponse = await request(app)
        .delete(`/api/like-articles/${likeId}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(adminDeleteResponse.body.success).toBe(true);
      expect(adminDeleteResponse.body.message).toBe('Like supprimé avec succès');
    }, 30000);

    it('should handle like update when user already liked', async () => {
      // Créer un like initial
      const createResponse = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: article.id,
          type: 'like'
        })
        .expect(201);

      const likeId = createResponse.body.data.id;

      // Essayer de créer un nouveau like pour le même article
      const updateResponse = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: article.id,
          type: 'love'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.message).toBe('Like mis à jour avec succès');
      expect(updateResponse.body.data.type).toBe('love');
      expect(updateResponse.body.data.id).toBe(likeId); // Même ID, donc mis à jour
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid like ID', async () => {
      const response = await request(app)
        .get('/api/like-articles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent like', async () => {
      const response = await request(app)
        .get('/api/like-articles/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
    });

    it('should handle unauthorized access to protected routes', async () => {
      // Essayer de créer un like sans authentification
      const createResponse = await request(app)
        .post('/api/like-articles')
        .send({
          articleId: article.id,
          type: 'like'
        })
        .expect(401);

      expect(createResponse.body.success).toBe(false);

      // Essayer de mettre à jour un like sans authentification
      const updateResponse = await request(app)
        .put('/api/like-articles/00000000-0000-0000-0000-000000000000')
        .send({
          type: 'love'
        })
        .expect(401);

      expect(updateResponse.body.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      // Créer un like avec des données invalides
      const invalidResponse = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: 'invalid-uuid',
          type: 'invalid'
        })
        .expect(400);

      expect(invalidResponse.body.success).toBe(false);

      // Mettre à jour avec des données invalides
      const like = await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });

      const invalidUpdateResponse = await request(app)
        .put(`/api/like-articles/${like.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          type: 'invalid'
        })
        .expect(400);

      expect(invalidUpdateResponse.body.success).toBe(false);
    });

    it('should handle non-existent article when creating like', async () => {
      const response = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: '00000000-0000-0000-0000-000000000000',
          type: 'like'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Article non trouvé');
    });
  });
});
