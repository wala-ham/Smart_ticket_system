# 🚀 GUIDE DE DÉMARRAGE RAPIDE

## Étapes en 5 minutes

### 1. Installer PostgreSQL

**Windows:**
- Télécharger depuis https://www.postgresql.org/download/windows/
- Installer avec le mot de passe: `postgres`

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Créer la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base
CREATE DATABASE ticket_system;

# Quitter
\q
```

### 3. Installer les dépendances

```bash
cd ticket-backend
npm install
```

### 4. Configurer .env

Le fichier `.env` est déjà créé avec les paramètres par défaut.
Si votre mot de passe PostgreSQL est différent, modifiez la ligne :

```
DB_PASSWORD=votre_mot_de_passe
```

### 5. Peupler la base de données

```bash
npm run seed
```

Vous verrez :
```
✨ Base de données peuplée avec succès !

📋 COMPTES CRÉÉS :

👑 ADMIN:
   Email: admin@ticket.com
   Password: admin123

👨‍💼 EMPLOYÉS:
   Email: tech@ticket.com      | Password: tech123
   Email: billing@ticket.com   | Password: billing123
   Email: support@ticket.com   | Password: support123

👥 CLIENTS:
   Email: client1@email.com    | Password: client123
   Email: client2@email.com    | Password: client123
   Email: client3@email.com    | Password: client123
```

### 6. Démarrer le serveur

```bash
npm run dev
```

Vous verrez :
```
✅ Connexion PostgreSQL établie avec succès
✅ Modèles synchronisés avec PostgreSQL
🚀 Serveur démarré avec succès !
📍 URL: http://localhost:5000
```

### 7. Tester avec Postman

#### Test 1: Connexion
```
POST http://localhost:5000/api/auth/login
Body (JSON):
{
  "email": "client1@email.com",
  "password": "client123"
}
```

Copier le `token` de la réponse.

#### Test 2: Voir mes tickets
```
GET http://localhost:5000/api/tickets
Headers:
  Authorization: Bearer <votre_token>
```

#### Test 3: Créer un ticket
```
POST http://localhost:5000/api/tickets
Headers:
  Authorization: Bearer <votre_token>
Body (JSON):
{
  "subject": "Test de ticket",
  "description": "Ceci est un test",
  "category_id": 1
}
```

## ✅ C'est tout !

Votre backend est opérationnel !

## 📚 Prochaines étapes

1. Lire le README.md complet
2. Tester toutes les routes API
3. Intégrer avec le frontend React
4. Ajouter le module IA Python

## 🆘 Problèmes courants

### Erreur: "Connection refused"
→ PostgreSQL n'est pas démarré
```bash
# Windows: Démarrer depuis Services
# macOS: brew services start postgresql@14
# Linux: sudo systemctl start postgresql
```

### Erreur: "password authentication failed"
→ Modifier DB_PASSWORD dans .env

### Erreur: "database does not exist"
→ Créer la base de données:
```bash
psql -U postgres -c "CREATE DATABASE ticket_system;"
```

## 🎯 Commandes utiles

```bash
# Démarrer en mode développement
npm run dev

# Démarrer en mode production
npm start

# Réinitialiser la base de données
npm run seed

# Voir les tables PostgreSQL
psql -U postgres -d ticket_system -c "\dt"

# Voir les utilisateurs
psql -U postgres -d ticket_system -c "SELECT id, email, role FROM users;"
```

---

**Bon courage ! 💪**
