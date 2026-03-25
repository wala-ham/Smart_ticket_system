# 🎫 Ticket System Backend API

Backend API complet pour un système de gestion de tickets avec authentification JWT, rôles utilisateurs et PostgreSQL.

## 🚀 Fonctionnalités

- ✅ Authentification JWT (Register/Login)
- ✅ Gestion des rôles (Customer, Employee, Admin)
- ✅ CRUD complet des tickets
- ✅ Système de commentaires
- ✅ Assignation intelligente des tickets
- ✅ Statistiques et dashboard
- ✅ Gestion des catégories
- ✅ Gestion des utilisateurs
- ✅ Validation des données
- ✅ Relations PostgreSQL optimisées

## 📋 Prérequis

- Node.js v18+ 
- PostgreSQL 14+
- npm ou yarn

## 🔧 Installation

### 1. Cloner le repository

```bash
git clone <votre-repo>
cd ticket-backend
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE ticket_system;

# Quitter
\q
```

### 4. Configurer les variables d'environnement

Copier le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Modifier `.env` avec vos informations :

```env
# Configuration du serveur
PORT=5000
NODE_ENV=development

# Configuration PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticket_system
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_postgres

# JWT Secret (générer une clé sécurisée)
JWT_SECRET=votre_secret_jwt_tres_securise_123456789
JWT_EXPIRES_IN=7d

# URL du service IA Python (optionnel)
AI_SERVICE_URL=http://localhost:5001
```

### 5. Peupler la base de données

```bash
npm run seed
```

Cela créera :
- 4 catégories
- 1 admin
- 3 employés (technique, facturation, support)
- 3 clients
- 6 tickets exemples

### 6. Démarrer le serveur

```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:5000`

## 📚 Documentation API

### 🔐 Authentification

#### Inscription (Customer)
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "phone": "+21620123456"
}
```

#### Connexion
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Profil utilisateur
```
GET /api/auth/profile
Authorization: Bearer <token>
```

### 🎫 Tickets

#### Créer un ticket
```
POST /api/tickets
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Problème de connexion",
  "description": "Je ne peux pas me connecter...",
  "category_id": 1
}
```

#### Liste des tickets
```
GET /api/tickets?status=open&priority=high&page=1&limit=10
Authorization: Bearer <token>
```

#### Détails d'un ticket
```
GET /api/tickets/:id
Authorization: Bearer <token>
```

#### Modifier un ticket
```
PUT /api/tickets/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "critical",
  "assigned_to": 2
}
```

#### Ajouter un commentaire
```
POST /api/tickets/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Bonjour, nous travaillons sur votre demande...",
  "is_internal": false
}
```

#### Assigner un ticket (Employee/Admin)
```
PUT /api/tickets/:id/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "employee_id": 2
}
```

### 👥 Utilisateurs (Admin uniquement)

#### Liste des utilisateurs
```
GET /api/users?role=employee&page=1
Authorization: Bearer <token>
```

#### Créer un utilisateur
```
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "employee@ticket.com",
  "password": "password123",
  "full_name": "Jane Smith",
  "role": "employee",
  "team": "technique"
}
```

#### Employés disponibles
```
GET /api/users/employees/available?team=technique
Authorization: Bearer <token>
```

### 📊 Statistiques

#### Dashboard personnel
```
GET /api/stats/dashboard
Authorization: Bearer <token>
```

#### Statistiques globales (Staff)
```
GET /api/stats/global
Authorization: Bearer <token>
```

#### Statistiques par période
```
GET /api/stats/period?period=week
Authorization: Bearer <token>
```

### 📂 Catégories

#### Liste des catégories
```
GET /api/categories
Authorization: Bearer <token>
```

#### Créer une catégorie (Admin)
```
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Support VIP",
  "description": "Support prioritaire",
  "default_team": "support",
  "color": "#9B59B6"
}
```

## 👤 Comptes de test

### Admin
- Email: `admin@ticket.com`
- Password: `admin123`

### Employés
- Email: `tech@ticket.com` | Password: `tech123` | Équipe: Technique
- Email: `billing@ticket.com` | Password: `billing123` | Équipe: Facturation
- Email: `support@ticket.com` | Password: `support123` | Équipe: Support

### Clients
- Email: `client1@email.com` | Password: `client123`
- Email: `client2@email.com` | Password: `client123`
- Email: `client3@email.com` | Password: `client123`

## 🎭 Rôles et Permissions

### Customer (Client)
- ✅ Créer des tickets
- ✅ Voir ses propres tickets
- ✅ Ajouter des commentaires sur ses tickets
- ✅ Modifier le sujet/description de ses tickets
- ❌ Voir les tickets des autres
- ❌ Changer le statut ou la priorité
- ❌ Assigner des tickets

### Employee (Employé)
- ✅ Voir tous les tickets
- ✅ Modifier les tickets (statut, priorité, assignation)
- ✅ Assigner des tickets
- ✅ Ajouter des commentaires (publics et internes)
- ✅ Accès aux statistiques
- ❌ Gérer les utilisateurs
- ❌ Supprimer des tickets

### Admin (Administrateur)
- ✅ Tous les droits des employés
- ✅ Créer/modifier/supprimer des utilisateurs
- ✅ Créer/modifier/supprimer des catégories
- ✅ Supprimer des tickets
- ✅ Accès complet aux statistiques

## 📁 Structure du projet

```
ticket-backend/
├── src/
│   ├── config/
│   │   └── database.js          # Configuration PostgreSQL
│   ├── models/
│   │   ├── index.js              # Instance Sequelize
│   │   ├── User.js               # Modèle utilisateur
│   │   ├── Ticket.js             # Modèle ticket
│   │   ├── Comment.js            # Modèle commentaire
│   │   ├── Attachment.js         # Modèle pièce jointe
│   │   ├── Category.js           # Modèle catégorie
│   │   └── associations.js       # Relations entre modèles
│   ├── controllers/
│   │   ├── auth.controller.js    # Logique authentification
│   │   ├── ticket.controller.js  # Logique tickets
│   │   ├── user.controller.js    # Logique utilisateurs
│   │   ├── category.controller.js# Logique catégories
│   │   └── stats.controller.js   # Logique statistiques
│   ├── routes/
│   │   ├── auth.routes.js        # Routes auth
│   │   ├── ticket.routes.js      # Routes tickets
│   │   ├── user.routes.js        # Routes users
│   │   ├── category.routes.js    # Routes catégories
│   │   └── stats.routes.js       # Routes stats
│   ├── middleware/
│   │   ├── auth.middleware.js    # Vérification JWT
│   │   └── role.middleware.js    # Vérification rôles
│   ├── utils/
│   │   └── validators.js         # Validations
│   ├── seeders/
│   │   └── seed.js               # Données de test
│   └── server.js                 # Point d'entrée
├── .env.example                  # Template variables env
├── .gitignore
├── package.json
└── README.md
```

## 🔍 Exemples de requêtes Postman

### 1. Inscription d'un nouveau client
```
POST http://localhost:5000/api/auth/register
Body (JSON):
{
  "email": "nouveau@client.com",
  "password": "password123",
  "full_name": "Nouveau Client",
  "phone": "+216 20 999 888"
}
```

### 2. Connexion
```
POST http://localhost:5000/api/auth/login
Body (JSON):
{
  "email": "client1@email.com",
  "password": "client123"
}

→ Copier le token de la réponse
```

### 3. Créer un ticket
```
POST http://localhost:5000/api/tickets
Headers:
  Authorization: Bearer <votre_token>
Body (JSON):
{
  "subject": "Problème urgent",
  "description": "Description détaillée du problème...",
  "category_id": 1
}
```

### 4. Voir mes tickets
```
GET http://localhost:5000/api/tickets
Headers:
  Authorization: Bearer <votre_token>
```

### 5. Statistiques du dashboard
```
GET http://localhost:5000/api/stats/dashboard
Headers:
  Authorization: Bearer <votre_token>
```

## 🐛 Débogage

### Vérifier la connexion PostgreSQL
```bash
psql -U postgres -d ticket_system -c "SELECT * FROM users;"
```

### Voir les logs du serveur
Les logs s'affichent dans la console en mode développement.

### Réinitialiser la base de données
```bash
npm run seed
```

## 🚢 Déploiement

### Sur Render.com (Gratuit)

1. Créer un compte sur [Render](https://render.com)
2. Créer une nouvelle "Web Service"
3. Connecter votre repository GitHub
4. Configuration :
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Variables d'environnement : Ajouter toutes les variables du `.env`

### Sur Railway.app (Gratuit)

1. Créer un compte sur [Railway](https://railway.app)
2. Nouveau projet → Deploy from GitHub
3. Ajouter une base PostgreSQL
4. Configurer les variables d'environnement

## 📝 Notes importantes

- Les mots de passe sont hashés avec bcrypt
- Les tokens JWT expirent après 7 jours par défaut
- La pagination est limitée à 100 éléments max par page
- Les commentaires internes ne sont visibles que par les employees et admins
- L'assignation automatique sera implémentée avec le module IA Python

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT

## 👨‍💻 Auteur

GLSI 2025-2026 - Projet Système de Tickets

## 🆘 Support

Pour toute question : ouvrir une issue sur GitHub

---

**Bon développement ! 🚀**
