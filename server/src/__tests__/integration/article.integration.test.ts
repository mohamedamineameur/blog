import request from 'supertest';
import app from '../../app';
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
const cleanupArticles = async (): Promise<void> => {
  await Article.destroy({ where: {}, force: true });
};

const cleanupCategories = async (): Promise<void> => {
  await Category.destroy({ where: {}, force: true });
};

describe('Article Integration Tests', () => {
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

  describe('Complete Article Workflow', () => {
    it('should handle complete article lifecycle', async () => {
      // 1. Créer un article
      const createResponse = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          categoryId: category.id,
          title: 'My First Article',
          content: 'This is the content of my first article about technology.',
          status: 'draft'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe('My First Article');
      expect(createResponse.body.data.status).toBe('draft');
      const articleId = createResponse.body.data.id;

      // 2. Récupérer l'article créé
      const getResponse = await request(app)
        .get(`/api/articles/${articleId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(articleId);
      expect(getResponse.body.data.title).toBe('My First Article');

      // 3. Lister tous les articles
      const listResponse = await request(app)
        .get('/api/articles')
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.data).toHaveLength(1);
      expect(listResponse.body.data.data[0].title).toBe('My First Article');

      // 4. Mettre à jour l'article
      const updateResponse = await request(app)
        .put(`/api/articles/${articleId}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          title: 'Updated Article Title',
          content: 'Updated content with more details.',
          status: 'published'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe('Updated Article Title');
      expect(updateResponse.body.data.status).toBe('published');

      // 5. Changer le statut de l'article
      const statusResponse = await request(app)
        .patch(`/api/articles/${articleId}/status`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({ status: 'hided' })
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.status).toBe('hided');

      // 6. Vérifier que l'article a été mis à jour
      const updatedGetResponse = await request(app)
        .get(`/api/articles/${articleId}`)
        .expect(200);

      expect(updatedGetResponse.body.success).toBe(true);
      expect(updatedGetResponse.body.data.title).toBe('Updated Article Title');
      expect(updatedGetResponse.body.data.status).toBe('hided');

      // 7. Supprimer l'article
      const deleteResponse = await request(app)
        .delete(`/api/articles/${articleId}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Article supprimé avec succès');

      // 8. Vérifier que l'article a été supprimé
      const deletedGetResponse = await request(app)
        .get(`/api/articles/${articleId}`)
        .expect(404);

      expect(deletedGetResponse.body.success).toBe(false);
    }, 30000);

    it('should handle multiple articles with different statuses', async () => {
      // Créer plusieurs articles avec différents statuts
      const articles = [
        { title: 'Published Article 1', content: 'Content 1', status: 'published' },
        { title: 'Draft Article 1', content: 'Content 2', status: 'draft' },
        { title: 'Hided Article 1', content: 'Content 3', status: 'hided' },
        { title: 'Published Article 2', content: 'Content 4', status: 'published' },
        { title: 'Draft Article 2', content: 'Content 5', status: 'draft' }
      ];

      for (const articleData of articles) {
        await request(app)
          .post('/api/articles')
          .set('Cookie', [
            `sessionId=${userSession.id}`,
            `token=${userToken}`
          ])
          .send({
            categoryId: category.id,
            ...articleData
          })
          .expect(201);
      }

      // Tester la pagination
      const page1Response = await request(app)
        .get('/api/articles?page=1&limit=3')
        .expect(200);

      expect(page1Response.body.success).toBe(true);
      expect(page1Response.body.data.data).toHaveLength(3);
      expect(page1Response.body.data.pagination.total).toBe(5);
      expect(page1Response.body.data.pagination.totalPages).toBe(2);

      // Tester le filtrage par statut
      const publishedResponse = await request(app)
        .get('/api/articles?status=published')
        .expect(200);

      expect(publishedResponse.body.success).toBe(true);
      expect(publishedResponse.body.data.data).toHaveLength(2);
      expect(publishedResponse.body.data.data.every((article: any) => article.status === 'published')).toBe(true);

      // Tester la recherche
      const searchResponse = await request(app)
        .get('/api/articles?search=Published')
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.data).toHaveLength(2);
      expect(searchResponse.body.data.data.every((article: any) => article.title.includes('Published'))).toBe(true);

      // Tester le tri
      const sortedResponse = await request(app)
        .get('/api/articles?sortBy=title&sortOrder=ASC')
        .expect(200);

      expect(sortedResponse.body.success).toBe(true);
      const titles = sortedResponse.body.data.data.map((article: any) => article.title);
      expect(titles).toEqual(titles.sort());
    }, 30000);

    it('should handle admin permissions correctly', async () => {
      // Créer un article en tant qu'utilisateur régulier
      const createResponse = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          categoryId: category.id,
          title: 'User Article',
          content: 'Content by regular user',
          status: 'draft'
        })
        .expect(201);

      const articleId = createResponse.body.data.id;

      // Admin peut modifier l'article d'un autre utilisateur
      const adminUpdateResponse = await request(app)
        .put(`/api/articles/${articleId}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({
          title: 'Admin Modified Article',
          content: 'Modified by admin',
          status: 'published'
        })
        .expect(200);

      expect(adminUpdateResponse.body.success).toBe(true);
      expect(adminUpdateResponse.body.data.title).toBe('Admin Modified Article');

      // Admin peut changer le statut
      const adminStatusResponse = await request(app)
        .patch(`/api/articles/${articleId}/status`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({ status: 'hided' })
        .expect(200);

      expect(adminStatusResponse.body.success).toBe(true);
      expect(adminStatusResponse.body.data.status).toBe('hided');

      // Admin peut supprimer l'article
      const adminDeleteResponse = await request(app)
        .delete(`/api/articles/${articleId}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(adminDeleteResponse.body.success).toBe(true);
      expect(adminDeleteResponse.body.message).toBe('Article supprimé avec succès');
    }, 30000);

    it('should handle category relationships correctly', async () => {
      // Créer une deuxième catégorie
      const category2 = await Category.create({
        name: 'Science',
        description: 'Science articles'
      });

      // Créer des articles dans différentes catégories
      const techArticle = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          categoryId: category.id,
          title: 'Tech Article',
          content: 'Technology content',
          status: 'published'
        })
        .expect(201);

      const scienceArticle = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          categoryId: category2.id,
          title: 'Science Article',
          content: 'Science content',
          status: 'published'
        })
        .expect(201);

      // Filtrer par catégorie
      const techArticlesResponse = await request(app)
        .get(`/api/articles?categoryId=${category.id}`)
        .expect(200);

      expect(techArticlesResponse.body.success).toBe(true);
      expect(techArticlesResponse.body.data.data).toHaveLength(1);
      expect(techArticlesResponse.body.data.data[0].title).toBe('Tech Article');

      const scienceArticlesResponse = await request(app)
        .get(`/api/articles?categoryId=${category2.id}`)
        .expect(200);

      expect(scienceArticlesResponse.body.success).toBe(true);
      expect(scienceArticlesResponse.body.data.data).toHaveLength(1);
      expect(scienceArticlesResponse.body.data.data[0].title).toBe('Science Article');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid article ID', async () => {
      const response = await request(app)
        .get('/api/articles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent article', async () => {
      const response = await request(app)
        .get('/api/articles/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
    });

    it('should handle unauthorized access to protected routes', async () => {
      // Essayer de créer un article sans authentification
      const createResponse = await request(app)
        .post('/api/articles')
        .send({
          categoryId: category.id,
          title: 'Unauthorized Article',
          content: 'This should fail'
        })
        .expect(401);

      expect(createResponse.body.success).toBe(false);

      // Essayer de mettre à jour un article sans authentification
      const updateResponse = await request(app)
        .put('/api/articles/00000000-0000-0000-0000-000000000000')
        .send({
          title: 'Unauthorized Update',
          content: 'This should fail'
        })
        .expect(401);

      expect(updateResponse.body.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      // Créer un article avec des données invalides
      const invalidResponse = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          categoryId: 'invalid-uuid',
          title: '', // Titre vide
          content: '' // Contenu vide
        })
        .expect(400);

      expect(invalidResponse.body.success).toBe(false);

      // Mettre à jour avec des données invalides
      const article = await Article.create({
        userId: regularUser.id,
        categoryId: category.id,
        title: 'Test Article',
        content: 'Test content',
        status: 'draft'
      });

      const invalidUpdateResponse = await request(app)
        .put(`/api/articles/${article.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          title: '', // Titre vide
          content: '' // Contenu vide
        })
        .expect(400);

      expect(invalidUpdateResponse.body.success).toBe(false);
    });

    it('should handle non-existent category when creating article', async () => {
      const response = await request(app)
        .post('/api/articles')
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          categoryId: '00000000-0000-0000-0000-000000000000',
          title: 'Article with invalid category',
          content: 'This should fail'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Catégorie non trouvée');
    });
  });
});
