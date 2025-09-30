# Système d'Authentification

Ce document décrit le système d'authentification implémenté avec JWT et gestion des sessions.

## Fonctionnalités

### 1. Modèle Session
- **ID unique** : UUID pour chaque session
- **User ID** : Référence vers l'utilisateur
- **Token Hash** : Token JWT hashé avec bcrypt
- **IP Address** : Adresse IP de la connexion
- **User Agent** : Navigateur utilisé
- **Active** : Statut de la session
- **Expires At** : Date d'expiration

### 2. Contrôleurs d'Authentification

#### Login (`POST /api/auth/login`)
- Vérifie les identifiants (email/password)
- Vérifie si l'utilisateur n'est pas banni
- Génère un token JWT
- Crée ou met à jour une session
- Retourne les cookies `sessionId` et `token`

#### Logout (`POST /api/auth/logout`)
- Désactive la session
- Nettoie les cookies

#### Session (`GET /api/auth/session`)
- Vérifie la validité de la session
- Retourne les informations utilisateur et session

### 3. Middleware d'Authentification

#### `authenticate`
- Vérifie les cookies `sessionId` et `token`
- Valide la session (active, non expirée)
- Vérifie le token hashé
- Vérifie que l'utilisateur n'est pas banni
- Ajoute `req.user` et `req.session` à la requête

#### `requireAdmin`
- Vérifie que l'utilisateur est administrateur

#### `requireEmailVerified`
- Vérifie que l'email est vérifié

### 4. Gestion des Sessions Uniques

Le système implémente une logique de session unique basée sur :
- **User ID** : Même utilisateur
- **IP Address** : Même adresse IP
- **User Agent** : Même navigateur

Si une session existe déjà avec ces trois critères, elle est mise à jour au lieu d'en créer une nouvelle.

### 5. Sécurité

- **Tokens hashés** : Les tokens JWT sont hashés avec bcrypt avant stockage
- **Expiration** : Sessions avec date d'expiration
- **Validation** : Vérification complète à chaque requête
- **Cookies sécurisés** : Transmission via cookies HTTP-only

## Utilisation

### Variables d'Environnement

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```

### Exemple de Login

```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important pour les cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
```

### Exemple de Vérification de Session

```javascript
const response = await fetch('/api/auth/session', {
  credentials: 'include' // Important pour les cookies
});
```

### Protection des Routes

```javascript
import { authenticate, requireAdmin } from '../middleware/auth';

// Route protégée
app.get('/api/protected', authenticate, (req, res) => {
  // req.user contient les informations utilisateur
  res.json({ user: req.user });
});

// Route admin
app.get('/api/admin', authenticate, requireAdmin, (req, res) => {
  res.json({ message: 'Admin access granted' });
});
```

## Tests

### Tests Unitaires
- `src/__tests__/auth.test.ts` : Tests des contrôleurs d'authentification
- `src/__tests__/fixtures/auth.fixtures.ts` : Données de test

### Tests d'Intégration
- `src/__tests__/integration/auth.integration.test.ts` : Tests du workflow complet

### Exécution des Tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tous les tests
npm test
```

## API Endpoints

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/auth/login` | Connexion | Non |
| POST | `/api/auth/logout` | Déconnexion | Non |
| GET | `/api/auth/session` | Informations de session | Oui |

## Structure des Réponses

### Login Success
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "uuid",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john@example.com",
      "isAdmin": false,
      "isEmailVerified": true,
      "isBanned": false
    },
    "sessionId": "session-uuid"
  }
}
```

### Session Info
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "session": {
      "id": "session-uuid",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "isActive": true,
      "expiresAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```
