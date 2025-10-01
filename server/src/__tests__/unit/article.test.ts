import request from 'supertest';
import app from '../../app';
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
const cleanupArticles = async (): Promise<void> => {
  await Article.destroy({ where: {}, force: true });
};

const cleanupCategories = async (): Promise<void> => {
  await Category.destroy({ where: {}, force: true });
};

const cleanupUsers = async (): Promise<void> => {
  await User.destroy({ where: {}, force: true });
};

describe('Article CRUD Operations', () => {
  let adminUser: User;
  let regularUser: User;
  let adminToken: string;
  let adminSession: Session;
  let userToken: string;
  let userSession: Session;
  let category: Category;

  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
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
  });

  afterAll(async () => {
    await cleanupArticles();
    await cleanupCategories();
    await cleanupUsers();
    await cleanupAuth();
  });

  describe('GET /api/articles', () => {
    it('should get all articles without authentication', async () => {
      // Créer quelques articles de test
      await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Article 1',
        content: 'Content 1',
        status: 'published'
      });
      await Article.create({
        userId: adminUser.id,
        categoryId: category.id,
        title: 'Article 2',
        content: 'Content 2',
        status: 'draft'
      });

      const response = await request(app)
        .get('/api/articles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should get articles with pagination', async () => {
      // Créer plusieurs articles
      for (let i = 1; i <= 15; i++) {
        await Article.create({
          userId: regularUser.id,
          categoryId: category.id,
          title: `Article ${i}`,
          content: `Content for article ${i}`,
          status: 'published'
        });
      }

      const response = await request(app)
        .get('/api/articles?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.total).toBe(15);
      expect(response.body.data.pagination.totalPages).toBe(3);
    });

    it('should search articles by title and content', async () => {
      await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'JavaScript Tutorial',
        content: 'Learn JavaScript basics',
        status: 'published'
      });
      await Article.create({
        userId: adminUser.id,
        categoryId: category.id,
        title: 'Python Guide',
        content: 'Learn Python programming',
        status: 'published'
      });

      const response = await request(app)
        .get('/api/articles?search=JavaScript')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('JavaScript Tutorial');
    });

    it('should filter articles by status', async () => {
      await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Published Article',
        content: 'This is published',
        status: 'published'
      });
      await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Draft Article',
        content: 'This is draft',
        status: 'draft'
      });

      const response = await request(app)
        .get('/api/articles?status=published')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('Published Article');
    });

    it('should filter articles by category', async () => {
      const category2 = await Category.create({
        name: 'Science',
        description: 'Science articles'
      });

      await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Tech Article',
        content: 'Technology content',
        status: 'published'
      });
      await Article.create({
        userId: regularUser.id,
        categoryId: category2.id,
        title: 'Science Article',
        content: 'Science content',
        status: 'published'
      });

      const response = await request(app)
        .get(`/api/articles?categoryId=${category.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('Tech Article');
    });

    it('should sort articles', async () => {
      await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Z Article',
        content: 'Z content',
        status: 'published'
      });
      await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'A Article',
        content: 'A content',
        status: 'published'
      });

      const response = await request(app)
        .get('/api/articles?sortBy=title&sortOrder=ASC')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data[0].title).toBe('A Article');
      expect(response.body.data.data[1].title).toBe('Z Article');
    });
  });

  describe('GET /api/articles/:id', () => {
    it('should get an article by ID without authentication', async () => {
      const article = await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Test Article',
        content: 'Test content',
        status: 'published'
      });

      const response = await request(app)
        .get(`/api/articles/${article.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(article.id);
      expect(response.body.data.title).toBe('Test Article');
    });

    it('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .get('/api/articles/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/articles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/articles', () => {
    it('should create an article as authenticated user', async () => {
      const articleData = {
        categoryId: category.id,
        title: 'New Article',
        content: 'New article content',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(articleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article créé avec succès');
      expect(response.body.data.title).toBe('New Article');
      expect(response.body.data.userId).toBe(regularUser.id);
    });

    it('should deny access without authentication', async () => {
      const articleData = {
        categoryId: category.id,
        title: 'New Article',
        content: 'New article content'
      };

      const response = await request(app)
        .post('/api/articles')
        .send(articleData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent category', async () => {
      const articleData = {
        categoryId: '00000000-0000-0000-0000-000000000000',
        title: 'New Article',
        content: 'New article content'
      };

      const response = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(articleData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Catégorie non trouvée');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/articles/:id', () => {
    let article: Article;

    beforeEach(async () => {
      article = await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Original Title',
        content: 'Original content',
        status: 'draft'
      });
    });

    it('should update an article as the author', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        status: 'published'
      };

      const response = await request(app)
        .put(`/api/articles/${article.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article mis à jour avec succès');
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.status).toBe('published');
    });

    it('should update an article as admin', async () => {
      const updateData = {
        title: 'Admin Updated Title',
        content: 'Admin updated content'
      };

      const response = await request(app)
        .put(`/api/articles/${article.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Admin Updated Title');
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
        title: 'Unauthorized Update',
        content: 'Unauthorized content'
      };

      const response = await request(app)
        .put(`/api/articles/${article.id}`)
        .set('Cookie', [
          `sessionId=${otherSession.id}`,
          `token=${otherToken}`
        ])
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vous ne pouvez modifier que vos propres articles');
    });

    it('should deny access without authentication', async () => {
      const updateData = {
        title: 'Unauthorized Update',
        content: 'Unauthorized content'
      };

      const response = await request(app)
        .put(`/api/articles/${article.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent article', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const response = await request(app)
        .put('/api/articles/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Article non trouvé');
    });
  });

  describe('DELETE /api/articles/:id', () => {
    let article: Article;

    beforeEach(async () => {
      article = await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Article to Delete',
        content: 'Content to delete',
        status: 'draft'
      });
    });

    it('should delete an article as the author', async () => {
      const response = await request(app)
        .delete(`/api/articles/${article.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article supprimé avec succès');

      // Vérifier que l'article a été supprimé
      const deletedArticle = await Article.findByPk(article.id);
      expect(deletedArticle).toBeNull();
    });

    it('should delete an article as admin', async () => {
      const response = await request(app)
        .delete(`/api/articles/${article.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article supprimé avec succès');
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
        .delete(`/api/articles/${article.id}`)
        .set('Cookie', [
          `sessionId=${otherSession.id}`,
          `token=${otherToken}`
        ])
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vous ne pouvez supprimer que vos propres articles');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .delete(`/api/articles/${article.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .delete('/api/articles/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Article non trouvé');
    });
  });

  describe('PATCH /api/articles/:id/status', () => {
    let article: Article;

    beforeEach(async () => {
      article = await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Status Article',
        content: 'Content for status change',
        status: 'draft'
      });
    });

    it('should change article status as the author', async () => {
      const response = await request(app)
        .patch(`/api/articles/${article.id}/status`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({ status: 'published' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Statut de l\'article mis à jour avec succès');
      expect(response.body.data.status).toBe('published');
    });

    it('should change article status as admin', async () => {
      const response = await request(app)
        .patch(`/api/articles/${article.id}/status`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({ status: 'hided' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('hided');
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
        .patch(`/api/articles/${article.id}/status`)
        .set('Cookie', [
          `sessionId=${otherSession.id}`,
          `token=${otherToken}`
        ])
        .send({ status: 'published' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vous ne pouvez modifier que vos propres articles');
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .patch(`/api/articles/${article.id}/status`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
