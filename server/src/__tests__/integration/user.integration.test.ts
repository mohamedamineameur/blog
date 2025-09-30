import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User';
import { 
  IReqCreateUser,
  IResCreateUser,
  IResGetUser,
  IResUpdateUser,
  IResDeleteUser,
  IResVerifyEmail,
  IResChangePassword,
  IResToggleBan,
  IResGetUsers
} from '../../controllers/user.controllers';
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

describe('User Integration Tests', () => {
  let adminUser: User;
  let adminToken: string;
  let adminSession: Session;

  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test pour assurer l'indépendance
    await cleanupUsers();
    await cleanupAuth();

    // Créer un utilisateur admin pour les tests
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
  });

  afterAll(async () => {
    // Nettoyer la base de données après tous les tests
    await cleanupUsers();
    await cleanupAuth();
  });

  describe('Complete User Workflow', () => {
    it('should handle complete user lifecycle', async () => {
      // 1. Créer un nouvel utilisateur
      const createResponse = await request(app)
        .post('/api/users')
        .send(testUserData.valid as IReqCreateUser)
        .expect(201);

      const createData = createResponse.body as IResCreateUser;
      expect(createData.success).toBe(true);
      const newUser = createData.data;

      // Créer une session pour le nouvel utilisateur
      const userToken = generateTestToken(newUser.id);
      const userTokenHash = await hashTestToken(userToken);
      const userSession = await Session.create({
        userId: newUser.id,
        tokenHash: userTokenHash,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // 2. Vérifier que l'utilisateur est créé avec les bonnes valeurs par défaut
      expect(newUser.isAdmin).toBe(false);
      expect(newUser.isEmailVerified).toBe(false);
      expect(newUser.isBanned).toBe(false);
      expect(newUser).not.toHaveProperty('password');
      expect(newUser).not.toHaveProperty('otp');

      // 3. Récupérer l'utilisateur par ID (avec authentification admin)
      const getResponse = await request(app)
        .get(`/api/users/${newUser.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const getUserData = getResponse.body as IResGetUser;
      expect(getUserData.success).toBe(true);
      expect(getUserData.data.id).toBe(newUser.id);

      // 4. Mettre à jour l'utilisateur (avec authentification utilisateur)
      const updateResponse = await request(app)
        .put(`/api/users/${newUser.id}`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateUserData.valid)
        .expect(200);

      const updateData = updateResponse.body as IResUpdateUser;
      expect(updateData.success).toBe(true);
      expect(updateData.data.firstname).toBe(updateUserData.valid.firstname);

      // 5. Récupérer l'utilisateur pour obtenir l'OTP généré
      const userWithOtp = await User.findByPk(newUser.id);
      const userOtp = userWithOtp?.otp;
      
      // Vérifier l'email avec OTP (avec authentification utilisateur)
      const verifyResponse = await request(app)
        .post(`/api/users/${newUser.id}/verify-email`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({ otp: userOtp })
        .expect(200);

      const verifyData = verifyResponse.body as IResVerifyEmail;
      expect(verifyData.success).toBe(true);

      // 6. Changer le mot de passe (avec authentification utilisateur)
      const changePasswordResponse = await request(app)
        .post(`/api/users/${newUser.id}/change-password`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send(updateUserData.password)
        .expect(200);

      const changePasswordData = changePasswordResponse.body as IResChangePassword;
      expect(changePasswordData.success).toBe(true);

      // 7. Bannir l'utilisateur (avec authentification admin)
      const banResponse = await request(app)
        .patch(`/api/users/${newUser.id}/ban`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({ isBanned: true })
        .expect(200);

      const banData = banResponse.body as IResToggleBan;
      expect(banData.success).toBe(true);

      // 8. Vérifier que l'utilisateur est banni (avec authentification admin)
      const getBannedResponse = await request(app)
        .get(`/api/users/${newUser.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const getBannedData = getBannedResponse.body as IResGetUser;
      expect(getBannedData.data.isBanned).toBe(true);

      // 9. Débannir l'utilisateur (avec authentification admin)
      const unbanResponse = await request(app)
        .patch(`/api/users/${newUser.id}/ban`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .send({ isBanned: false })
        .expect(200);

      const unbanData = unbanResponse.body as IResToggleBan;
      expect(unbanData.success).toBe(true);

      // 10. Supprimer l'utilisateur (avec authentification admin)
      const deleteResponse = await request(app)
        .delete(`/api/users/${newUser.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const deleteData = deleteResponse.body as IResDeleteUser;
      expect(deleteData.success).toBe(true);

      // 11. Vérifier que l'utilisateur n'existe plus (avec authentification admin)
      const getDeletedResponse = await request(app)
        .get(`/api/users/${newUser.id}`)
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(404);

      const getDeletedData = getDeletedResponse.body as IResGetUser;
      expect(getDeletedData.success).toBe(false);

      // Cleanup spécifique pour ce test
      await User.destroy({ where: { id: newUser.id } });
    }, 30000);
  });

  describe('User Search and Filtering', () => {
    beforeEach(async () => {
      // Créer plusieurs utilisateurs pour les tests de recherche
      await createMultipleUsers();
    });

    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/users?search=Admin&page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const searchData = response.body as IResGetUsers;
      expect(searchData.success).toBe(true);
      expect(searchData.data.data.length).toBeGreaterThan(0);
      expect(searchData.data.data[0]?.firstname).toBe('Admin');
    });

    it('should filter users by admin status', async () => {
      const response = await request(app)
        .get('/api/users?isAdmin=true&page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const filterData = response.body as IResGetUsers;
      expect(filterData.success).toBe(true);
      expect(filterData.data.data.length).toBeGreaterThan(0);
      expect(filterData.data.data.every((user) => user.isAdmin)).toBe(true);
    });

    it('should filter users by email verification status', async () => {
      const response = await request(app)
        .get('/api/users?isEmailVerified=false&page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const filterData = response.body as IResGetUsers;
      expect(filterData.success).toBe(true);
      expect(filterData.data.data.length).toBeGreaterThan(0);
      expect(filterData.data.data.every((user) => !user.isEmailVerified)).toBe(true);
    });

    it('should filter users by ban status', async () => {
      const response = await request(app)
        .get('/api/users?isBanned=true&page=1&limit=10&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const filterData = response.body as IResGetUsers;
      expect(filterData.success).toBe(true);
      expect(filterData.data.data.length).toBeGreaterThan(0);
      expect(filterData.data.data.every((user) => user.isBanned)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const page1Response = await request(app)
        .get('/api/users?page=1&limit=2&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const page2Response = await request(app)
        .get('/api/users?page=2&limit=2&sortBy=createdAt&sortOrder=ASC')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(200);

      const page1Data = page1Response.body as IResGetUsers;
      const page2Data = page2Response.body as IResGetUsers;
      
      expect(page1Data.success).toBe(true);
      expect(page2Data.success).toBe(true);
      expect(page1Data.data.pagination.page).toBe(1);
      expect(page2Data.data.pagination.page).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const response = await request(app)
        .post('/api/users')
        .send(testUserData.invalid)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle duplicate email errors', async () => {
      // Créer d'abord un utilisateur
      await request(app)
        .post('/api/users')
        .send(testUserData.duplicate as IReqCreateUser)
        .expect(201);

      // Essayer de créer un utilisateur avec le même email
      const response = await request(app)
        .post('/api/users')
        .send(testUserData.duplicate as IReqCreateUser)
        .expect(409);

      const duplicateData = response.body as IResCreateUser;
      expect(duplicateData.success).toBe(false);
      expect(duplicateData.message).toContain('email existe déjà');

      // Cleanup spécifique pour ce test
      await User.destroy({ where: { email: testUserData.duplicate.email } });
    });

    it('should handle non-existent user errors', async () => {
      const response = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [
          `sessionId=${adminSession.id}`,
          `token=${adminToken}`
        ])
        .expect(404);

      const notFoundData = response.body as IResGetUser;
      expect(notFoundData.success).toBe(false);
    });

    it('should handle incorrect OTP errors', async () => {
      const unverifiedUser = await createUserInDb(userFixtures.unverified);
      
      // Créer une session pour l'utilisateur non vérifié
      const userToken = generateTestToken(unverifiedUser.id);
      const userTokenHash = await hashTestToken(userToken);
      const userSession = await Session.create({
        userId: unverifiedUser.id,
        tokenHash: userTokenHash,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post(`/api/users/${unverifiedUser.id}/verify-email`)
        .set('Cookie', [
          `sessionId=${userSession.id}`,
          `token=${userToken}`
        ])
        .send({ otp: '000000' })
        .expect(400);

      const otpData = response.body as IResVerifyEmail;
      expect(otpData.success).toBe(false);
      expect(otpData.message).toContain('Code OTP invalide');

      // Cleanup spécifique pour ce test
      await User.destroy({ where: { id: unverifiedUser.id } });
    });

    it('should handle incorrect password errors', async () => {
      const regularUser = await createUserInDb(userFixtures.regular);
      
      // Créer une session pour l'utilisateur régulier
      const userToken = generateTestToken(regularUser.id);
      const userTokenHash = await hashTestToken(userToken);
      const userSession = await Session.create({
        userId: regularUser.id,
        tokenHash: userTokenHash,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

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

      const passwordData = response.body as IResChangePassword;
      expect(passwordData.success).toBe(false);
      expect(passwordData.message).toContain('actuel incorrect');

      // Cleanup spécifique pour ce test
      await User.destroy({ where: { id: regularUser.id } });
    });
  });
});
