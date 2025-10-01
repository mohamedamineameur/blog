import request from 'supertest';
import app from '../../app';
import { CommentArticle } from '../../models/CommentArticle';
import { Article } from '../../models/Article';
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
const cleanupCommentArticles = async (): Promise<void> => {
  await CommentArticle.destroy({ where: {}, force: true });
};

const cleanupArticles = async (): Promise<void> => {
  await Article.destroy({ where: {}, force: true });
};

const cleanupCategories = async (): Promise<void> => {
  await Category.destroy({ where: {}, force: true });
};

describe('CommentArticle CRUD Operations', () => {
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
    await cleanupCommentArticles();
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
    await cleanupCommentArticles();
    await cleanupArticles();
    await cleanupCategories();
    await cleanupUsers();
    await cleanupAuth();
  });

  describe('GET /api/comment-articles', () => {
    it('should get all comments without authentication', async () => {
      // Créer quelques commentaires de test
      await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'First comment'
      });
      await CommentArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        content: 'Second comment'
      });

      const response = await request(app)
        .get('/api/comment-articles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should get comments with pagination', async () => {
      // Créer plusieurs commentaires
      for (let i = 1; i <= 15; i++) {
        const testUser = await createUserInDb({
          firstname: `Test${i}`,
          lastname: `User${i}`,
          email: `test${i}@example.com`,
          password: 'password123'
        });
        await CommentArticle.create({
          userId: testUser.id,
          articleId: article.id,
          content: `Comment ${i}`
        });
      }

      const response = await request(app)
        .get('/api/comment-articles?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.total).toBe(15);
      expect(response.body.data.pagination.totalPages).toBe(3);
    }, 30000);

    it('should filter comments by article', async () => {
      const article2 = await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Article 2',
        content: 'Content 2',
        status: 'published'
      });

      await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'Comment on article 1'
      });
      await CommentArticle.create({
        userId: adminUser.id,
        articleId: article2.id,
        content: 'Comment on article 2'
      });

      const response = await request(app)
        .get(`/api/comment-articles?articleId=${article.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].articleId).toBe(article.id);
    });

    it('should filter comments by user', async () => {
      await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'User comment'
      });
      await CommentArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        content: 'Admin comment'
      });

      const response = await request(app)
        .get(`/api/comment-articles?userId=${regularUser.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].userId).toBe(regularUser.id);
    });

    it('should filter comments by approval status', async () => {
      await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'Approved comment',
        isApproved: true
      });
      await CommentArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        content: 'Pending comment',
        isApproved: false
      });

      const response = await request(app)
        .get('/api/comment-articles?isApproved=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].isApproved).toBe(false);
    });

    it('should sort comments', async () => {
      await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'First comment'
      });
      await CommentArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        content: 'Second comment'
      });

      const response = await request(app)
        .get('/api/comment-articles?sortBy=content&sortOrder=ASC')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data[0].content).toBe('First comment');
      expect(response.body.data.data[1].content).toBe('Second comment');
    });
  });

  describe('GET /api/comment-articles/:id', () => {
    it('should get a comment by ID without authentication', async () => {
      const comment = await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'Test comment'
      });

      const response = await request(app)
        .get(`/api/comment-articles/${comment.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(comment.id);
      expect(response.body.data.content).toBe('Test comment');
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .get('/api/comment-articles/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/comment-articles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/comment-articles', () => {
    it('should create a comment as authenticated user', async () => {
      const commentData = {
        articleId: article.id,
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Commentaire créé avec succès');
      expect(response.body.data.content).toBe('This is a test comment');
      expect(response.body.data.userId).toBe(regularUser.id);
    });

    it('should create a reply to a comment', async () => {
      // Créer un commentaire parent
      const parentComment = await CommentArticle.create({
        userId: adminUser.id,
        articleId: article.id,
        content: 'Parent comment'
      });

      const replyData = {
        articleId: article.id,
        content: 'This is a reply',
        parentId: parentComment.id
      };

      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(replyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('This is a reply');
      expect(response.body.data.parentId).toBe(parentComment.id);
    });

    it('should deny access without authentication', async () => {
      const commentData = {
        articleId: article.id,
        content: 'Test comment'
      };

      const response = await request(app)
        .post('/api/comment-articles')
        .send(commentData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent article', async () => {
      const commentData = {
        articleId: '00000000-0000-0000-0000-000000000000',
        content: 'Test comment'
      };

      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(commentData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Article non trouvé');
    });

    it('should return 404 for non-existent parent comment', async () => {
      const commentData = {
        articleId: article.id,
        content: 'Reply to non-existent comment',
        parentId: '00000000-0000-0000-0000-000000000000'
      };

      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(commentData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Commentaire parent non trouvé');
    });

    it('should return 400 for parent comment from different article', async () => {
      const article2 = await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Article 2',
        content: 'Content 2',
        status: 'published'
      });

      const parentComment = await CommentArticle.create({
        userId: adminUser.id,
        articleId: article2.id,
        content: 'Parent comment'
      });

      const commentData = {
        articleId: article.id,
        content: 'Reply to comment from different article',
        parentId: parentComment.id
      };

      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Le commentaire parent doit appartenir au même article');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate content length', async () => {
      const commentData = {
        articleId: article.id,
        content: 'a'.repeat(2001) // Too long
      };

      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/comment-articles/:id', () => {
    let comment: CommentArticle;

    beforeEach(async () => {
      comment = await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'Original comment'
      });
    });

    it('should update a comment as the author', async () => {
      const updateData = {
        content: 'Updated comment'
      };

      const response = await request(app)
        .put(`/api/comment-articles/${comment.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Commentaire mis à jour avec succès');
      expect(response.body.data.content).toBe('Updated comment');
    });

    it('should update a comment as admin', async () => {
      const updateData = {
        content: 'Admin updated comment'
      };

      const response = await request(app)
        .put(`/api/comment-articles/${comment.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Admin updated comment');
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
        content: 'Unauthorized update'
      };

      const response = await request(app)
        .put(`/api/comment-articles/${comment.id}`)
        .set('Cookie', [
          `sessionId=${otherSession.id}`,
          `token=${otherToken}`
        ])
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vous ne pouvez modifier que vos propres commentaires');
    });

    it('should deny access without authentication', async () => {
      const updateData = {
        content: 'Unauthorized update'
      };

      const response = await request(app)
        .put(`/api/comment-articles/${comment.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      const updateData = {
        content: 'Updated comment'
      };

      const response = await request(app)
        .put('/api/comment-articles/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Commentaire non trouvé');
    });
  });

  describe('DELETE /api/comment-articles/:id', () => {
    let comment: CommentArticle;

    beforeEach(async () => {
      comment = await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'Comment to delete'
      });
    });

    it('should delete a comment as the author', async () => {
      const response = await request(app)
        .delete(`/api/comment-articles/${comment.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Commentaire supprimé avec succès');

      // Vérifier que le commentaire a été supprimé
      const deletedComment = await CommentArticle.findByPk(comment.id);
      expect(deletedComment).toBeNull();
    });

    it('should delete a comment as admin', async () => {
      const response = await request(app)
        .delete(`/api/comment-articles/${comment.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Commentaire supprimé avec succès');
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
        .delete(`/api/comment-articles/${comment.id}`)
        .set('Cookie', [
          `sessionId=${otherSession.id}`,
          `token=${otherToken}`
        ])
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vous ne pouvez supprimer que vos propres commentaires');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .delete(`/api/comment-articles/${comment.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .delete('/api/comment-articles/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Commentaire non trouvé');
    });
  });

  describe('PATCH /api/comment-articles/:id/approve', () => {
    let comment: CommentArticle;

    beforeEach(async () => {
      comment = await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'Comment to approve',
        isApproved: false
      });
    });

    it('should approve a comment as admin', async () => {
      const approveData = {
        isApproved: true
      };

      const response = await request(app)
        .patch(`/api/comment-articles/${comment.id}/approve`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(approveData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Commentaire approuvé avec succès');
      expect(response.body.data.isApproved).toBe(true);
    });

    it('should deny access to non-admin users', async () => {
      const approveData = {
        isApproved: true
      };

      const response = await request(app)
        .patch(`/api/comment-articles/${comment.id}/approve`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(approveData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Accès refusé : privilèges administrateur requis');
    });

    it('should deny access without authentication', async () => {
      const approveData = {
        isApproved: true
      };

      const response = await request(app)
        .patch(`/api/comment-articles/${comment.id}/approve`)
        .send(approveData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      const approveData = {
        isApproved: true
      };

      const response = await request(app)
        .patch('/api/comment-articles/00000000-0000-0000-0000-000000000000/approve')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send(approveData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Commentaire non trouvé');
    });
  });
});
