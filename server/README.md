# Server API

Une API Express.js avec TypeScript, Sequelize et SQLite pour la gestion des utilisateurs.

## Fonctionnalités

- **CRUD complet** pour les utilisateurs
- **Validation** des données avec Joi
- **Hachage** des mots de passe avec bcryptjs
- **Base de données** SQLite avec Sequelize
- **Tests** unitaires et d'intégration avec Jest
- **Base de données en mémoire** pour les tests

## Installation

```bash
npm install
```

## Scripts disponibles

### Développement
```bash
npm run dev          # Démarrer le serveur en mode développement
npm run build        # Compiler TypeScript
npm start           # Démarrer le serveur en production
```

### Tests
```bash
npm test             # Exécuter tous les tests
npm run test:unit    # Exécuter seulement les tests unitaires
npm run test:integration  # Exécuter seulement les tests d'intégration
npm run test:watch   # Exécuter les tests en mode watch
npm run test:coverage # Exécuter les tests avec couverture
```

## Structure du projet

```
src/
├── config/          # Configuration (variables d'environnement)
├── controllers/     # Contrôleurs (logique métier)
├── db/             # Configuration de la base de données
├── middleware/     # Middleware Express
├── models/         # Modèles Sequelize
├── routes/         # Routes Express
├── schemas/        # Schémas de validation Joi
└── __tests__/      # Tests
    ├── fixtures/   # Données de test
    ├── integration/ # Tests d'intégration
    └── setup.ts    # Configuration des tests
```

## API Endpoints

### Utilisateurs

- `POST /api/users` - Créer un utilisateur
- `GET /api/users` - Lister les utilisateurs (avec pagination et filtres)
- `GET /api/users/:id` - Récupérer un utilisateur par ID
- `PUT /api/users/:id` - Mettre à jour un utilisateur
- `DELETE /api/users/:id` - Supprimer un utilisateur
- `POST /api/users/:id/verify-email` - Vérifier l'email avec OTP
- `POST /api/users/:id/change-password` - Changer le mot de passe
- `PATCH /api/users/:id/ban` - Bannir/débannir un utilisateur

## Tests

### Tests unitaires
Testent chaque fonction individuellement avec des fixtures prédéfinies.

### Tests d'intégration
Testent le flux complet de l'API avec des scénarios réalistes.

### Fixtures
Les fixtures fournissent des données de test cohérentes et réutilisables :
- Utilisateurs avec différents rôles et statuts
- Données de test valides et invalides
- Données pour les mises à jour et la pagination

## Base de données

- **Développement** : SQLite avec fichier `data.sqlite`
- **Tests** : SQLite en mémoire (`:memory:`)
- **Production** : SQLite avec fichier configurable

## Variables d'environnement

```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=*
DB_STORAGE=./data.sqlite
```

## Exemple d'utilisation

### Créer un utilisateur
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "password": "Password123!"
  }'
```

### Lister les utilisateurs
```bash
curl "http://localhost:3001/api/users?page=1&limit=10&sortBy=createdAt&sortOrder=ASC"
```

### Filtrer les utilisateurs
```bash
curl "http://localhost:3001/api/users?search=John&isAdmin=false&isEmailVerified=true"
```

