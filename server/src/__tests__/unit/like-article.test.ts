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

describe('LikeArticle CRUD Operations', () => {
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

  describe('GET /api/like-articles', () => {
    it('should get all likes without authentication', async () => {
      // Créer quelques likes de test
      await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });
      await LikeArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        type: 'love'
      });

      const response = await request(app)
        .get('/api/like-articles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should get likes with pagination', async () => {
      // Créer plusieurs utilisateurs et likes
      for (let i = 1; i <= 15; i++) {
        const testUser = await createUserInDb({
          firstname: `Test${i}`,
          lastname: `User${i}`,
          email: `test${i}@example.com`,
          password: 'password123'
        });
        await LikeArticle.create({
          userId: testUser.id,
          articleId: article.id,
          type: 'like'
        });
      }

      const response = await request(app)
        .get('/api/like-articles?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.total).toBe(15);
      expect(response.body.data.pagination.totalPages).toBe(3);
    }, 30000);

    it('should filter likes by type', async () => {
      await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });
      await LikeArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        type: 'love'
      });

      const response = await request(app)
        .get('/api/like-articles?type=like')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].type).toBe('like');
    });

    it('should filter likes by article', async () => {
      const article2 = await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Article 2',
        content: 'Content 2',
        status: 'published'
      });

      await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });
      await LikeArticle.create({
        userId: adminUser.id,
        articleId: article2.id,
        type: 'love'
      });

      const response = await request(app)
        .get(`/api/like-articles?articleId=${article.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].articleId).toBe(article.id);
    });

    it('should filter likes by user', async () => {
      await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });
      await LikeArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        type: 'love'
      });

      const response = await request(app)
        .get(`/api/like-articles?userId=${regularUser.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].userId).toBe(regularUser.id);
    });

    it('should sort likes', async () => {
      await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'angry'
      });
      await LikeArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        type: 'like'
      });

      const response = await request(app)
        .get('/api/like-articles?sortBy=type&sortOrder=ASC')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data[0].type).toBe('angry');
      expect(response.body.data.data[1].type).toBe('like');
    });
  });

  describe('GET /api/like-articles/:id', () => {
    it('should get a like by ID without authentication', async () => {
      const like = await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });

      const response = await request(app)
        .get(`/api/like-articles/${like.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(like.id);
      expect(response.body.data.type).toBe('like');
    });

    it('should return 404 for non-existent like', async () => {
      const response = await request(app)
        .get('/api/like-articles/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/like-articles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/like-articles/stats/:articleId', () => {
    it('should get like statistics for an article', async () => {
      // Créer des utilisateurs supplémentaires pour les likes
      const user1 = await createUserInDb({
        firstname: 'User1',
        lastname: 'Test',
        email: 'user1@example.com',
        password: 'password123'
      });
      const user2 = await createUserInDb({
        firstname: 'User2',
        lastname: 'Test',
        email: 'user2@example.com',
        password: 'password123'
      });

      // Créer des likes de différents types
      await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });
      await LikeArticle.create({
        userId: user1.id,
        articleId: article.id,
        type: 'like'
      });
      await LikeArticle.create({
        userId: user2.id,
        articleId: article.id,
        type: 'love'
      });

      const response = await request(app)
        .get(`/api/like-articles/stats/${article.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articleId).toBe(article.id);
      expect(response.body.data.stats.like).toBe(2);
      expect(response.body.data.stats.love).toBe(1);
      expect(response.body.data.stats.total).toBe(3);
    });

    it('should return empty stats for non-existent article', async () => {
      const response = await request(app)
        .get('/api/like-articles/stats/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/like-articles', () => {
    it('should create a like as authenticated user', async () => {
      const likeData = {
        articleId: article.id,
        type: 'like'
      };

      const response = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(likeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Like créé avec succès');
      expect(response.body.data.type).toBe('like');
      expect(response.body.data.userId).toBe(regularUser.id);
    });

    it('should update existing like if user already liked the article', async () => {
      // Créer un like initial
      await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });

      const likeData = {
        articleId: article.id,
        type: 'love'
      };

      const response = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(likeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Like mis à jour avec succès');
      expect(response.body.data.type).toBe('love');
    });

    it('should deny access without authentication', async () => {
      const likeData = {
        articleId: article.id,
        type: 'like'
      };

      const response = await request(app)
        .post('/api/like-articles')
        .send(likeData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent article', async () => {
      const likeData = {
        articleId: '00000000-0000-0000-0000-000000000000',
        type: 'like'
      };

      const response = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(likeData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Article non trouvé');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate type values', async () => {
      const likeData = {
        articleId: article.id,
        type: 'invalid'
      };

      const response = await request(app)
        .post('/api/like-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(likeData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/like-articles/:id', () => {
    let like: LikeArticle;

    beforeEach(async () => {
      like = await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });
    });

    it('should update a like as the author', async () => {
      const updateData = {
        type: 'love'
      };

      const response = await request(app)
        .put(`/api/like-articles/${like.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Like mis à jour avec succès');
      expect(response.body.data.type).toBe('love');
    });

    it('should update a like as admin', async () => {
      const updateData = {
        type: 'angry'
      };

      const response = await request(app)
        .put(`/api/like-articles/${like.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('angry');
    });

    it('should deny access to other users', async () => {
      const otherUser = await createUserInDb({
        firstname: 'Other',
        lastname: 'User',
        email: 'other@example.com',
        password: 'password123'
      });
      const otherToken = generateTestToken(otherUser.id);
      const otherTokenHash = await hashTestToken(otherToken);
      const otherSession = await Session.create({
        userId: otherUser.id,
        tokenHash: otherTokenHash,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const updateData = {
        type: 'love'
      };

      const response = await request(app)
        .put(`/api/like-articles/${like.id}`)
        .set('Cookie', [
          `sessionId=${otherSession.id}`,
          `token=${otherToken}`
        ])
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vous ne pouvez modifier que vos propres likes');
    });

    it('should deny access without authentication', async () => {
      const updateData = {
        type: 'love'
      };

      const response = await request(app)
        .put(`/api/like-articles/${like.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent like', async () => {
      const updateData = {
        type: 'love'
      };

      const response = await request(app)
        .put('/api/like-articles/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Like non trouvé');
    });
  });

  describe('DELETE /api/like-articles/:id', () => {
    let like: LikeArticle;

    beforeEach(async () => {
      like = await LikeArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        type: 'like'
      });
    });

    it('should delete a like as the author', async () => {
      const response = await request(app)
        .delete(`/api/like-articles/${like.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Like supprimé avec succès');

      // Vérifier que le like a été supprimé
      const deletedLike = await LikeArticle.findByPk(like.id);
      expect(deletedLike).toBeNull();
    });

    it('should delete a like as admin', async () => {
      const response = await request(app)
        .delete(`/api/like-articles/${like.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Like supprimé avec succès');
    });

    it('should deny access to other users', async () => {
      const otherUser = await createUserInDb({
        firstname: 'Other',
        lastname: 'User',
        email: 'other@example.com',
        password: 'password123'
      });
      const otherToken = generateTestToken(otherUser.id);
      const otherTokenHash = await hashTestToken(otherToken);
      const otherSession = await Session.create({
        userId: otherUser.id,
        tokenHash: otherTokenHash,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .delete(`/api/like-articles/${like.id}`)
        .set('Cookie', [
          `sessionId=${otherSession.id}`,
          `token=${otherToken}`
        ])
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vous ne pouvez supprimer que vos propres likes');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .delete(`/api/like-articles/${like.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent like', async () => {
      const response = await request(app)
        .delete('/api/like-articles/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Like non trouvé');
    });
  });
});
