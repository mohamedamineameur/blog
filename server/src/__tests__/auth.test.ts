import request from 'supertest';
import app from '../app';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { 
  IResLogin, 
  IResLogout, 
  IResSession 
} from '../controllers/auth.controllers';
import { 
  authTestData,
  cleanupAuth,
  generateTestToken,
  hashTestToken
} from './fixtures/auth.fixtures';
import { userFixtures } from './fixtures/user.fixtures';
import bcrypt from 'bcryptjs';

describe('Authentication Tests', () => {
  let testUser: User;
  let testSession: Session;
  let testToken: string;

  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await cleanupAuth();
    
    // Créer un utilisateur de test avec mot de passe hashé
    const hashedPassword = await bcrypt.hash(userFixtures.regular.password, 12);
    testUser = await User.create({
      ...userFixtures.regular,
      password: hashedPassword
    });
    
    // Générer un token de test
    testToken = generateTestToken(testUser.id);
    const tokenHash = await hashTestToken(testToken);
    
    // Créer une session de test
    testSession = await Session.create({
      userId: testUser.id,
      tokenHash,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: userFixtures.regular.password
        })
        .expect(200);

      const loginData = response.body as IResLogin;
      expect(loginData.success).toBe(true);
      expect(loginData.data?.user.email).toBe(testUser.email);
      expect(loginData.data?.sessionId).toBeDefined();
      
      // Vérifier que les cookies sont définis
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(authTestData.invalidEmail)
        .expect(401);

      const loginData = response.body as IResLogin;
      expect(loginData.success).toBe(false);
      expect(loginData.message).toContain('Email ou mot de passe incorrect');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(authTestData.invalidPassword)
        .expect(401);

      const loginData = response.body as IResLogin;
      expect(loginData.success).toBe(false);
      expect(loginData.message).toContain('Email ou mot de passe incorrect');
    });

    it('should not login with banned user', async () => {
      // Créer un utilisateur banni avec mot de passe hashé
      const hashedPassword = await bcrypt.hash(userFixtures.banned.password, 12);
      await User.create({
        ...userFixtures.banned,
        email: 'banned@example.com',
        password: hashedPassword
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'banned@example.com',
          password: userFixtures.banned.password
        })
        .expect(403);

      const loginData = response.body as IResLogin;
      expect(loginData.success).toBe(false);
      expect(loginData.message).toContain('suspendu');

      // Cleanup spécifique pour ce test
      await User.destroy({ where: { email: 'banned@example.com' } });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(authTestData.invalidFormat)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [
          `sessionId=${testSession.id}`,
          `token=${testToken}`
        ])
        .send({ sessionId: testSession.id })
        .expect(200);

      const logoutData = response.body as IResLogout;
      expect(logoutData.success).toBe(true);
      expect(logoutData.message).toContain('Déconnexion réussie');

      // Vérifier que la session est désactivée
      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession?.isActive).toBe(false);
    });

    it('should handle logout with invalid session ID', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [
          `sessionId=${testSession.id}`,
          `token=${testToken}`
        ])
        .send({ sessionId: '00000000-0000-0000-0000-000000000000' })
        .expect(200);

      const logoutData = response.body as IResLogout;
      expect(logoutData.success).toBe(true);
    });
  });

  describe('GET /api/auth/session', () => {
    it('should get session with valid cookies', async () => {
      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', [
          `sessionId=${testSession.id}`,
          `token=${testToken}`
        ])
        .expect(200);

      const sessionData = response.body as IResSession;
      expect(sessionData.success).toBe(true);
      expect(sessionData.data?.user.id).toBe(testUser.id);
      expect(sessionData.data?.session.id).toBe(testSession.id);
    });

    it('should not get session without cookies', async () => {
      const response = await request(app)
        .get('/api/auth/session')
        .expect(401);

      const sessionData = response.body as IResSession;
      expect(sessionData.success).toBe(false);
    });

    it('should not get session with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', [
          `sessionId=${testSession.id}`,
          `token=invalid-token`
        ])
        .expect(401);

      const sessionData = response.body as IResSession;
      expect(sessionData.success).toBe(false);
    });

    it('should not get session with expired session', async () => {
      // Créer une session expirée
      const expiredToken = generateTestToken(testUser.id);
      const expiredSession = await Session.create({
        userId: testUser.id,
        tokenHash: await hashTestToken(expiredToken),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expiré
      });

      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', [
          `sessionId=${expiredSession.id}`,
          `token=${expiredToken}`
        ])
        .expect(401);

      const sessionData = response.body as IResSession;
      expect(sessionData.success).toBe(false);
    });

    it('should not get session with inactive session', async () => {
      // Désactiver la session
      await testSession.update({ isActive: false });

      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', [
          `sessionId=${testSession.id}`,
          `token=${testToken}`
        ])
        .expect(401);

      const sessionData = response.body as IResSession;
      expect(sessionData.success).toBe(false);
    });

    it('should not get session with banned user', async () => {
      // Bannir l'utilisateur
      await testUser.update({ isBanned: true });

      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', [
          `sessionId=${testSession.id}`,
          `token=${testToken}`
        ])
        .expect(403);

      const sessionData = response.body as IResSession;
      expect(sessionData.success).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should replace existing session for same user, IP and user agent', async () => {
      // Créer une session existante avec une date d'expiration proche
      const oldToken = generateTestToken(testUser.id);
      const oldTokenHash = await hashTestToken(oldToken);
      const existingSession = await Session.create({
        userId: testUser.id,
        tokenHash: oldTokenHash,
        ipAddress: '::ffff:127.0.0.1', // Utiliser le format IPv6 comme extrait par getRequestInfo
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire dans 24h
      });

      // Se connecter avec les mêmes informations en forçant l'IP et User-Agent
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
        .send({
          email: testUser.email,
          password: userFixtures.regular.password
        })
        .expect(200);

      const loginData = response.body as IResLogin;
      expect(loginData.success).toBe(true);

      // Vérifier que la session a été mise à jour
      const updatedSession = await Session.findByPk(existingSession.id);
      expect(updatedSession?.id).toBe(existingSession.id);
      // Vérifier que la session est toujours active
      expect(updatedSession?.isActive).toBe(true);
      // Vérifier que le token a été mis à jour (hash différent)
      expect(updatedSession?.tokenHash).not.toBe(oldTokenHash);

      // Cleanup spécifique pour ce test
      await Session.destroy({ where: { id: existingSession.id } });
    });
  });
});
