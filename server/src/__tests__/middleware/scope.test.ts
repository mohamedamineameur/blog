import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import { 
  userFixtures, 
  createUserInDb, 
  cleanupUsers 
} from '../fixtures/user.fixtures';
import { 
  generateTestToken,
  hashTestToken,
  cleanupAuth
} from '../fixtures/auth.fixtures';

describe('Scope Middleware Tests', () => {
  let regularUser: User;
  let adminUser: User;
  let otherUser: User;
  let regularUserToken: string;
  let adminUserToken: string;
  let regularUserSession: Session;
  let adminUserSession: Session;

  beforeEach(async () => {
    // Nettoyer la base de données
    await cleanupUsers();
    await cleanupAuth();

    // Créer des utilisateurs de test
    regularUser = await createUserInDb(userFixtures.regular);
    adminUser = await createUserInDb(userFixtures.admin);
    otherUser = await createUserInDb({
      firstname: 'Other',
      lastname: 'User',
      email: 'other@example.com',
      password: 'OtherPass123!',
      isAdmin: false,
      isEmailVerified: true,
      isBanned: false
    });

    // Créer des sessions et tokens
    regularUserToken = generateTestToken(regularUser.id);
    adminUserToken = generateTestToken(adminUser.id);

    const regularUserTokenHash = await hashTestToken(regularUserToken);
    const adminUserTokenHash = await hashTestToken(adminUserToken);

    regularUserSession = await Session.create({
      userId: regularUser.id,
      tokenHash: regularUserTokenHash,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    adminUserSession = await Session.create({
      userId: adminUser.id,
      tokenHash: adminUserTokenHash,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  });

  afterAll(async () => {
    await cleanupUsers();
    await cleanupAuth();
  });

  describe('User Scope Tests', () => {
    it('should allow user to access their own data', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUser.id);
    });

    it('should deny user access to other user data', async () => {
      const response = await request(app)
        .get(`/api/users/${otherUser.id}`)
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Accès refusé');
    });

    it('should allow user to update their own data', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .send({
          firstname: 'Updated',
          lastname: 'Name'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstname).toBe('Updated');
    });

    it('should deny user to update other user data', async () => {
      const response = await request(app)
        .put(`/api/users/${otherUser.id}`)
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .send({
          firstname: 'Hacked',
          lastname: 'Name'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Accès refusé');
    });
  });

  describe('Admin Scope Tests', () => {
    it('should allow admin to access all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', [
          `sessionId=${adminUserSession.id}`,
          `token=${adminUserToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
    });

    it('should deny regular user to access all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('privilèges administrateur requis');
    });

    it('should allow admin to access any user data', async () => {
      const response = await request(app)
        .get(`/api/users/${otherUser.id}`)
        .set('Cookie', [
          `sessionId=${adminUserSession.id}`,
          `token=${adminUserToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(otherUser.id);
    });

    it('should allow admin to ban users', async () => {
      const response = await request(app)
        .patch(`/api/users/${otherUser.id}/ban`)
        .set('Cookie', [
          `sessionId=${adminUserSession.id}`,
          `token=${adminUserToken}`
        ])
        .send({ isBanned: true })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny regular user to ban users', async () => {
      const response = await request(app)
        .patch(`/api/users/${otherUser.id}/ban`)
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .send({ isBanned: true })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('privilèges administrateur requis');
    });
  });

  describe('User or Admin Scope Tests', () => {
    it('should allow user to access their own data', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin to access any user data', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          `sessionId=${adminUserSession.id}`,
          `token=${adminUserToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny user to access other user data', async () => {
      const response = await request(app)
        .get(`/api/users/${otherUser.id}`)
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Force User Scope Tests (/me routes)', () => {
    it('should allow user to access their own data via /me', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUser.id);
    });

    it('should allow user to update their own data via /me', async () => {
      const response = await request(app)
        .put('/api/users/me')
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .send({
          firstname: 'Updated',
          lastname: 'Name'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstname).toBe('Updated');
    });

    it('should allow user to change their own password via /me', async () => {
      const response = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', [
          `sessionId=${regularUserSession.id}`,
          `token=${regularUserToken}`
        ])
        .send({
          currentPassword: userFixtures.regular.password,
          newPassword: 'NewPass123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Unauthenticated Access Tests', () => {
    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token d\'authentification manquant');
    });

    it('should deny access with invalid session', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Cookie', [
          'sessionId=invalid-session-id',
          'token=invalid-token'
        ])
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
