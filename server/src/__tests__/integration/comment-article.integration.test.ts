import request from 'supertest';
import app from '../../app';
import { CommentArticle } from '../../models/comment-article';
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
const cleanupCommentArticles = async (): Promise<void> => {
  await CommentArticle.destroy({ where: {}, force: true });
};

const cleanupArticles = async (): Promise<void> => {
  await Article.destroy({ where: {}, force: true });
};

const cleanupCategories = async (): Promise<void> => {
  await Category.destroy({ where: {}, force: true });
};

describe('CommentArticle Integration Tests', () => {
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

  describe('Complete CommentArticle Workflow', () => {
    it('should handle complete comment lifecycle', async () => {
      // 1. Créer un commentaire
      const createResponse = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: article.id,
          content: 'This is a test comment'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.content).toBe('This is a test comment');
      const commentId = createResponse.body.data.id;

      // 2. Récupérer le commentaire créé
      const getResponse = await request(app)
        .get(`/api/comment-articles/${commentId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(commentId);
      expect(getResponse.body.data.content).toBe('This is a test comment');

      // 3. Lister tous les commentaires
      const listResponse = await request(app)
        .get('/api/comment-articles')
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.data).toHaveLength(1);
      expect(listResponse.body.data.data[0].content).toBe('This is a test comment');

      // 4. Mettre à jour le commentaire
      const updateResponse = await request(app)
        .put(`/api/comment-articles/${commentId}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          content: 'Updated comment content'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.content).toBe('Updated comment content');

      // 5. Vérifier que le commentaire a été mis à jour
      const updatedGetResponse = await request(app)
        .get(`/api/comment-articles/${commentId}`)
        .expect(200);

      expect(updatedGetResponse.body.success).toBe(true);
      expect(updatedGetResponse.body.data.content).toBe('Updated comment content');

      // 6. Supprimer le commentaire
      const deleteResponse = await request(app)
        .delete(`/api/comment-articles/${commentId}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Commentaire supprimé avec succès');

      // 7. Vérifier que le commentaire a été supprimé
      const deletedGetResponse = await request(app)
        .get(`/api/comment-articles/${commentId}`)
        .expect(404);

      expect(deletedGetResponse.body.success).toBe(false);
    }, 30000);

    it('should handle comment replies correctly', async () => {
      // 1. Créer un commentaire parent
      const parentResponse = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: article.id,
          content: 'Parent comment'
        })
        .expect(201);

      const parentId = parentResponse.body.data.id;

      // 2. Créer une réponse au commentaire
      const replyResponse = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          articleId: article.id,
          content: 'This is a reply',
          parentId: parentId
        })
        .expect(201);

      expect(replyResponse.body.success).toBe(true);
      expect(replyResponse.body.data.content).toBe('This is a reply');
      expect(replyResponse.body.data.parentId).toBe(parentId);

      // 3. Récupérer le commentaire parent avec ses réponses
      const parentWithRepliesResponse = await request(app)
        .get(`/api/comment-articles/${parentId}`)
        .expect(200);

      expect(parentWithRepliesResponse.body.success).toBe(true);
      expect(parentWithRepliesResponse.body.data.Replies).toHaveLength(1);
      expect(parentWithRepliesResponse.body.data.Replies[0].content).toBe('This is a reply');

      // 4. Lister tous les commentaires avec réponses
      const listResponse = await request(app)
        .get('/api/comment-articles?includeReplies=true')
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.data).toHaveLength(2); // Parent et réponse sont listés
      // Trouver le commentaire parent dans la liste
      const parentComment = listResponse.body.data.data.find((comment: { parentId: string | null }) => comment.parentId === null);
      expect(parentComment).toBeDefined();
      expect(parentComment.Replies).toHaveLength(1);
    }, 30000);

    it('should handle comment approval workflow', async () => {
      // 1. Créer un commentaire non approuvé
      const comment = await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'Comment awaiting approval',
        isApproved: false
      });

      // 2. Lister les commentaires non approuvés
      const unapprovedResponse = await request(app)
        .get('/api/comment-articles?isApproved=false')
        .expect(200);

      expect(unapprovedResponse.body.success).toBe(true);
      expect(unapprovedResponse.body.data.data).toHaveLength(1);
      expect(unapprovedResponse.body.data.data[0].isApproved).toBe(false);

      // 3. Approuver le commentaire en tant qu'admin
      const approveResponse = await request(app)
        .patch(`/api/comment-articles/${comment.id}/approve`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          isApproved: true
        })
        .expect(200);

      expect(approveResponse.body.success).toBe(true);
      expect(approveResponse.body.message).toBe('Commentaire approuvé avec succès');
      expect(approveResponse.body.data.isApproved).toBe(true);

      // 4. Vérifier que le commentaire est maintenant approuvé
      const approvedResponse = await request(app)
        .get('/api/comment-articles?isApproved=true')
        .expect(200);

      expect(approvedResponse.body.success).toBe(true);
      expect(approvedResponse.body.data.data).toHaveLength(1);
      expect(approvedResponse.body.data.data[0].isApproved).toBe(true);
    }, 30000);

    it('should handle multiple comments with pagination', async () => {
      // Créer plusieurs commentaires
      const commentCount = 15;
      for (let i = 1; i <= commentCount; i++) {
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
          .post('/api/comment-articles')
          .set('Cookie', [
            `sessionId=${testSession.id}`,
            `token=${testToken}`
          ])
          .send({
            articleId: article.id,
            content: `Comment ${i}`
          })
          .expect(201);
      }

      // Tester la pagination
      const page1Response = await request(app)
        .get('/api/comment-articles?page=1&limit=10')
        .expect(200);

      expect(page1Response.body.success).toBe(true);
      expect(page1Response.body.data.data).toHaveLength(10);
      expect(page1Response.body.data.pagination.total).toBe(commentCount);
      expect(page1Response.body.data.pagination.totalPages).toBe(2);

      // Tester la page suivante
      const page2Response = await request(app)
        .get('/api/comment-articles?page=2&limit=10')
        .expect(200);

      expect(page2Response.body.success).toBe(true);
      expect(page2Response.body.data.data).toHaveLength(5); // 15 - 10 = 5
      expect(page2Response.body.data.pagination.page).toBe(2);
    }, 60000);

    it('should handle admin permissions correctly', async () => {
      // Créer un commentaire en tant qu'utilisateur régulier
      const commentResponse = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: article.id,
          content: 'Comment by regular user'
        })
        .expect(201);

      const commentId = commentResponse.body.data.id;

      // Admin peut modifier le commentaire d'un autre utilisateur
      const adminUpdateResponse = await request(app)
        .put(`/api/comment-articles/${commentId}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          content: 'Admin modified comment'
        })
        .expect(200);

      expect(adminUpdateResponse.body.success).toBe(true);
      expect(adminUpdateResponse.body.data.content).toBe('Admin modified comment');

      // Admin peut supprimer le commentaire
      const adminDeleteResponse = await request(app)
        .delete(`/api/comment-articles/${commentId}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(adminDeleteResponse.body.success).toBe(true);
      expect(adminDeleteResponse.body.message).toBe('Commentaire supprimé avec succès');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid comment ID', async () => {
      const response = await request(app)
        .get('/api/comment-articles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent comment', async () => {
      const response = await request(app)
        .get('/api/comment-articles/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
    });

    it('should handle unauthorized access to protected routes', async () => {
      // Essayer de créer un commentaire sans authentification
      const createResponse = await request(app)
        .post('/api/comment-articles')
        .send({
          articleId: article.id,
          content: 'Unauthorized comment'
        })
        .expect(401);

      expect(createResponse.body.success).toBe(false);

      // Essayer de mettre à jour un commentaire sans authentification
      const updateResponse = await request(app)
        .put('/api/comment-articles/00000000-0000-0000-0000-000000000000')
        .send({
          content: 'Unauthorized update'
        })
        .expect(401);

      expect(updateResponse.body.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      // Créer un commentaire avec des données invalides
      const invalidResponse = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: 'invalid-uuid',
          content: ''
        })
        .expect(400);

      expect(invalidResponse.body.success).toBe(false);

      // Mettre à jour avec des données invalides
      const comment = await CommentArticle.create({
        userId: regularUser.id,
        articleId: article.id,
        content: 'Original comment'
      });

      const invalidUpdateResponse = await request(app)
        .put(`/api/comment-articles/${comment.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          content: ''
        })
        .expect(400);

      expect(invalidUpdateResponse.body.success).toBe(false);
    });

    it('should handle non-existent article when creating comment', async () => {
      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: '00000000-0000-0000-0000-000000000000',
          content: 'Comment on non-existent article'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Article non trouvé');
    });

    it('should handle non-existent parent comment', async () => {
      const response = await request(app)
        .post('/api/comment-articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          articleId: article.id,
          content: 'Reply to non-existent comment',
          parentId: '00000000-0000-0000-0000-000000000000'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Commentaire parent non trouvé');
    });
  });
});
