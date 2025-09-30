import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import { 
  IResLogin, 
  IResLogout, 
  IResSession 
} from '../../controllers/auth.controllers';
import { 
  authTestData,
  cleanupAuth,
  generateTestToken,
  hashTestToken,
  

} from '../fixtures/auth.fixtures';
import { userFixtures,createUserInDb  } from '../fixtures/user.fixtures';

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test pour assurer l'indépendance
    await cleanupAuth();
  });

  afterAll(async () => {
    // Nettoyer la base de données après tous les tests
    await cleanupAuth();
  });

  describe('Complete Authentication Workflow', () => {
    it('should handle complete authentication lifecycle', async () => {
      // 1. Créer un utilisateur
      const user = await createUserInDb(userFixtures.regular);

      // 2. Se connecter
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userFixtures.regular.email,
          password: userFixtures.regular.password
        })
        expect(200);

      const loginData = loginResponse.body as IResLogin;
      expect(loginData.success).toBe(true);
      expect(loginData.data?.user.id).toBe(user.id);

      // 3. Vérifier que les cookies sont définis
      const cookies = loginResponse.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies?.some((cookie: string) => cookie.includes('sessionId'))).toBe(true);
      expect(cookies?.some((cookie: string) => cookie.includes('token'))).toBe(true);

      // 4. Obtenir les informations de session
      const sessionResponse = await request(app)
        .get('/api/auth/session')
        .set('Cookie', cookies || [])
        .expect(200);

      const sessionData = sessionResponse.body as IResSession;
      expect(sessionData.success).toBe(true);
      expect(sessionData.data?.user.id).toBe(user.id);
      expect(sessionData.data?.session.isActive).toBe(true);

      // 5. Se déconnecter
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ sessionId: loginData.data?.sessionId })
        .expect(200);

      const logoutData = logoutResponse.body as IResLogout;
      expect(logoutData.success).toBe(true);

      // 6. Vérifier que la session est désactivée
      const session = await Session.findByPk(loginData.data?.sessionId);
      expect(session?.isActive).toBe(false);

      // 7. Vérifier que l'accès à la session échoue après déconnexion
      const sessionAfterLogoutResponse = await request(app)
        .get('/api/auth/session')
        .set('Cookie', cookies || [])
        .expect(401);

      const sessionAfterLogoutData = sessionAfterLogoutResponse.body as IResSession;
      expect(sessionAfterLogoutData.success).toBe(false);

      // Cleanup spécifique pour ce test
      await Session.destroy({ where: { userId: user.id } });
      await User.destroy({ where: { id: user.id } });
    });
  });

  describe('Session Security', () => {
    it('should handle multiple sessions for different IPs', async () => {
      const userData ={
        username: "test",
        email: "test2@test.com",
        password: "test",
        isAdmin: false,
        isEmailVerified: true,
        isBanned: false,
        firstname: "Test",
        lastname: "User"
      }
      const user = await createUserInDb(userData);

      // Session 1 - IP différente
      const session1 = await Session.create({
        userId: user.id,
        tokenHash: await hashTestToken('token1'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Browser 1)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // Session 2 - IP différente
      const session2 = await Session.create({
        userId: user.id,
        tokenHash: await hashTestToken('token2'),
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0 (Browser 2)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // Les deux sessions doivent être actives
      expect(session1.isActive).toBe(true);
      expect(session2.isActive).toBe(true);

      // Vérifier que les sessions sont distinctes
      expect(session1.id).not.toBe(session2.id);

      // Cleanup spécifique pour ce test
      await Session.destroy({ where: { userId: user.id } });
      await User.destroy({ where: { id: user.id } });
    });

    it('should handle session expiration', async () => {
      const user = await User.create(userFixtures.regular);
      const token = generateTestToken(user.id);

      // Créer une session qui expire dans 1 seconde
      const session = await Session.create({
        userId: user.id,
        tokenHash: await hashTestToken(token),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 1000) // 1 seconde
      });

      // Attendre que la session expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Vérifier que l'accès à la session échoue
      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', [
          `sessionId=${session.id}`,
          `token=${token}`
        ])
        .expect(401);

      const sessionData = response.body as IResSession;
      expect(sessionData.success).toBe(false);

      // Cleanup spécifique pour ce test
      await Session.destroy({ where: { userId: user.id } });
      await User.destroy({ where: { id: user.id } });
    });

    it('should handle banned user session invalidation', async () => {
      const user = await User.create(userFixtures.regular);
      const token = generateTestToken(user.id);

      // Créer une session active
      const session = await Session.create({
        userId: user.id,
        tokenHash: await hashTestToken(token),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // Bannir l'utilisateur
      await user.update({ isBanned: true });

      // Vérifier que l'accès à la session échoue
      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', [
          `sessionId=${session.id}`,
          `token=${token}`
        ])
        .expect(403);

      const sessionData = response.body as IResSession;
      expect(sessionData.success).toBe(false);

      // Cleanup spécifique pour ce test
      await Session.destroy({ where: { userId: user.id } });
      await User.destroy({ where: { id: user.id } });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid login credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(authTestData.invalidEmail)
        .expect(401);

      const loginData = response.body as IResLogin;
      expect(loginData.success).toBe(false);
      expect(loginData.message).toContain('Email ou mot de passe incorrect');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(authTestData.invalidFormat)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle server errors gracefully', async () => {
      // Tenter de se connecter avec des données malformées
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
