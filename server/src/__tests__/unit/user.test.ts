import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User';
import { IResUser} from '../../controllers/user.controllers';
import { 
  userFixtures, 
  createUserInDb, 
  createMultipleUsers, 
  cleanupUsers,
  testUserData,
  updateUserData
} from '../fixtures/user.fixtures';
import { 
  generateTestToken,
  hashTestToken,
  cleanupAuth
} from '../fixtures/auth.fixtures';
import { Session } from '../../models/Session';

describe('User CRUD Operations', () => {
  let adminUser: IResUser;
  let regularUser: IResUser;
  let adminToken: string;
  let adminSession: Session;
  let userToken: string;
  let userSession: Session;

  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await cleanupUsers();
    await cleanupAuth();
    
    // Créer des utilisateurs de test
    adminUser = await createUserInDb(userFixtures.admin);
    regularUser = await createUserInDb(userFixtures.regular);
    await createUserInDb(userFixtures.duplicate);

    // Créer des sessions pour l'authentification
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
    // Nettoyer la base de données après tous les tests
    await cleanupUsers();
    await cleanupAuth();
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
        const userData = {
            firstname: 'Test',
            lastname: 'User',
            email: 'test2@example.com',
            password: 'TestPass123!',
            isAdmin: false,
            isEmailVerified: false,
            isBanned: false,
        }
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        firstname: 'Test',
        lastname: 'User',
        email: 'test2@example.com',
        isAdmin: false,
        isEmailVerified: false,
        isBanned: false,
      });
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('otp');

      // Cleanup spécifique pour ce test
      await User.destroy({ where: { email: userData.email } });
    });

    it('should not create user with duplicate email', async () => {
      // Essayer de créer un utilisateur avec un email déjà utilisé
      const response = await request(app)
        .post('/api/users')
        .send(testUserData.duplicate)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email existe déjà');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .send(testUserData.invalid)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate password complexity', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          ...testUserData.valid,
          password: '123' // Mot de passe trop simple
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      // Créer plusieurs utilisateurs de test
      await createMultipleUsers();
    });

    it('should get all users with pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      });
    });

    it('should filter users by search term', async () => {
      const response = await request(app)
        .get('/api/users?search=Admin&page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
      expect(response.body.data.data[0].firstname).toBe('Admin');
    });

    it('should filter users by isAdmin', async () => {
      const response = await request(app)
        .get('/api/users?isAdmin=true&page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
      expect(response.body.data.data[0].isAdmin).toBe(true);
    });

    it('should filter users by isEmailVerified', async () => {
      const response = await request(app)
        .get('/api/users?isEmailVerified=false&page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
      expect(response.body.data.data[0].isEmailVerified).toBe(false);
    });

    it('should filter users by isBanned', async () => {
      const response = await request(app)
        .get('/api/users?isBanned=true&page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
      expect(response.body.data.data[0].isBanned).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUser.id);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('otp');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateUserData.valid)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstname).toBe(updateUserData.valid.firstname);
      expect(response.body.data.lastname).toBe(updateUserData.valid.lastname);
    });

    it('should not allow duplicate email on update', async () => {
      const updateData = {
        email: adminUser.email
      };

      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email existe déjà');
    });

    it('should update user email to unique email', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateUserData.email)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(updateUserData.email.email);
    });

    it('should update user admin status', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateUserData.admin)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isAdmin).toBe(true);
    });

    it('should update user ban status', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateUserData.ban)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isBanned).toBe(true);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      const response = await request(app)
        .delete(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('supprimé avec succès');

      // Vérifier que l'utilisateur n'existe plus
      const deletedUser = await User.findByPk(regularUser.id);
      expect(deletedUser).toBeNull();

      // Cleanup spécifique pour ce test - l'utilisateur est déjà supprimé
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/users/:id/verify-email', () => {
    let unverifiedUser: IResUser;
    let unverifiedToken: string;
    let unverifiedSession: Session;

    beforeEach(async () => {
      unverifiedUser = await createUserInDb(userFixtures.withOtp);
      
      // Créer une session pour l'utilisateur non vérifié
      unverifiedToken = generateTestToken(unverifiedUser.id);
      const unverifiedTokenHash = await hashTestToken(unverifiedToken);
      unverifiedSession = await Session.create({
        userId: unverifiedUser.id,
        tokenHash: unverifiedTokenHash,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    });

    it('should verify email with correct OTP', async () => {
      const response = await request(app)
        .post(`/api/users/${unverifiedUser.id}/verify-email`)
        .set('Cookie', [
          `sessionId=${unverifiedSession.id}`,
          `token=${unverifiedToken}`
        ])
        .send({ otp: '123456' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('vérifié avec succès');

      // Vérifier que l'email est marqué comme vérifié
      const updatedUser = await User.findByPk(unverifiedUser.id);
      expect(updatedUser?.isEmailVerified).toBe(true);
      expect(updatedUser?.otp).toBeNull();

      // Cleanup spécifique pour ce test
      await User.destroy({ where: { id: unverifiedUser.id } });
    });

    it('should not verify email with incorrect OTP', async () => {
      const response = await request(app)
        .post(`/api/users/${unverifiedUser.id}/verify-email`)
        .set('Cookie', [
          `sessionId=${unverifiedSession.id}`,
          `token=${unverifiedToken}`
        ])
        .send({ otp: '000000' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Code OTP invalide');

      // Cleanup spécifique pour ce test
      await User.destroy({ where: { id: unverifiedUser.id } });
    });

    it('should not verify already verified email', async () => {
      const response = await request(app)
        .post(`/api/users/${adminUser.id}/verify-email`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({ otp: '123456' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('déjà vérifié');
    });
  });

  describe('POST /api/users/:id/change-password', () => {
    it('should change password with correct current password', async () => {
      const response = await request(app)
        .post(`/api/users/${regularUser.id}/change-password`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          currentPassword: userFixtures.regular.password,
          newPassword: updateUserData.password.newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('changé avec succès');

      // Cleanup spécifique pour ce test - l'utilisateur est déjà nettoyé par beforeEach
    });

    it('should not change password with incorrect current password', async () => {
      const response = await request(app)
        .post(`/api/users/${regularUser.id}/change-password`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPass123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('actuel incorrect');

      // Cleanup spécifique pour ce test - l'utilisateur est déjà nettoyé par beforeEach
    });
  });

  describe('PATCH /api/users/:id/ban', () => {
    it('should ban user', async () => {
      const response = await request(app)
        .patch(`/api/users/${regularUser.id}/ban`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({ isBanned: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('banni avec succès');

      // Cleanup spécifique pour ce test - l'utilisateur est déjà nettoyé par beforeEach
    });

    it('should unban user', async () => {
      const response = await request(app)
        .patch(`/api/users/${regularUser.id}/ban`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({ isBanned: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('débanni avec succès');

      // Cleanup spécifique pour ce test - l'utilisateur est déjà nettoyé par beforeEach
    });
  });
});
