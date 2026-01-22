## Matcha

Application de rencontre temps réel (projet `Matcha` de l'école 42) avec profils, suggestions, recherche avancée, likes/matchs, chat et notifications. Frontend React (Vite) servi par un backend Express avec SQLite (better-sqlite3) et WebSocket (Socket.io). Conçu pour tourner en local et être déployé facilement.

### Contexte (Sujet Matcha 42)
- Construire une application de rencontre complète : inscription, vérification d’email, auth JWT via cookies HTTP-only, complétion de profil (photos, tags, bio, genre, préférences), géolocalisation, popularité.
- Parcours utilisateur complet : suggestions basées sur préférences + distance + tags, recherche multi-critères, interactions (like/unlike, block/unblock, report), chat temps réel seulement entre matchs, notifications en live.
- Contraintes pédagogiques 42 : sécurité (XSS, CSRF via cookies HTTP-only, rate limiting), validations serveurs, code propre et structuré.

### Stack Technique
- Frontend (React + Vite)
	- React 19, Vite 7, React Router 7, React Hook Form 7
	- Axios (HTTP), React-Toastify (toasts), Socket.io Client, zxcvbn (force MDP)
- Backend (Node.js + Express)
	- Express 5, better-sqlite3 (SQLite), JWT + cookies HTTP-only
	- Socket.io (temps réel), Multer (upload), Nodemailer (emails), bcrypt (hash), dotenv
	- Sécurité: Helmet, CORS, express-rate-limit; Logs: morgan
- Outils/Dev
	- Nodemon, ESLint, @vitejs/plugin-react

### Librairies externes (exhaustif)
- Backend: express, better-sqlite3, zod, jsonwebtoken, bcrypt, cookie-parser, cors, express-rate-limit, helmet, morgan, multer, nodemailer, socket.io, dotenv, uuid, @faker-js/faker, zxcvbn
- Frontend: react, react-dom, react-router-dom, react-hook-form, axios, react-toastify, socket.io-client, zxcvbn
- Dev: nodemon (backend), vite, @vitejs/plugin-react, eslint et plugins, types React

### Structure
- frontend/src : routes, contextes (`AuthContext`, `SocketContext`), pages, composants UI
- backend/src : app Express, routes (`auth`, `users`, `browsing`, `interactions`, `notifications`, `chat`), `schemas` (Zod), `socket`, `email`, `db`
- backend/uploads : stockage des images utilisateur

### Pré-requis
- Node.js >= 18
- npm (inclus avec Node)

### Installation
```bash
git clone https://github.com/jdeinane/matcha.git
cd matcha

# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### Configuration (.env)
Créer un fichier `.env` dans `backend/` (le frontend n’a pas d’ENV obligatoire) :
```env
# Requis
JWT_SECRET=change_me

# Optionnels
PORT=3000
# URL publique utilisée pour CORS et pour générer les liens d’email
# En mode "build", le backend sert le frontend sur http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Chemin de la base (par défaut: ./matcha.db à la racine backend)
DB_PATH=./matcha.db

```

### Démarrage (build + run)
1) Builder le frontend
```bash
cd frontend
npm run build
```
2) Pré-remplir la base de données (500 utilisateurs aléatoires)
```bash
cd ../backend
npm run seed
```
3) Démarrer le backend (sert aussi le build frontend)
```bash
cd backend
npm start
```
L’application est servie sur http://localhost:3000

### Création d’un utilisateur & vérification (Nodemailer)
1) Lancer le backend (voir ci-dessus) puis ouvrir la page d’inscription.
2) Remplir le formulaire.
3) Après l’inscription, un email de vérification est envoyé via Nodemailer (Ethereal en dev). Dans les logs backend, repérer la ligne:
	 - « Preview URL: https://ethereal.email/message/... »
4) Ouvrir l’URL de prévisualisation, puis cliquer sur le lien « Verify your Matcha account ».
5) Vous êtes redirigé sur l’app, le compte est vérifié et vous pouvez vous connecter.

Si besoin, on peut verifier la DB et les derniers enregistrements:
```bash
cd backend
node check_db.js
```

### Fonctionnalités
- Authentification: inscription, login/logout, vérification email, mot de passe oublié + reset par email
- Profil: nom/prénom, bio, tags, genre, préférence, date de naissance, localisation (lat/lon + ville), suppression de compte
- Photos: upload (Multer), max 5, définition de la photo de profil, suppression
- Suggestions: algorithme (préférences, distance, tags, popularité) avec score et tri
- Recherche avancée: filtres âge, popularité, distance, tags (multi)
- Interactions: like, unlike (unmatch), block/unblock, report (email admin simulé)
- Notifications: like, match, visit, unlike, en temps réel (Socket.io) + compteur non lus
- Chat: conversations uniquement entre matchs, historique, marquage « lu », temps réel via Socket.io
- Présence/Statut: en ligne/hors ligne, `last_seen` mis à jour à la déconnexion
- Sécurité: JWT en cookies HTTP-only, Helmet, CORS, rate limiting, validations Zod

### Scripts utiles
- Frontend: `npm run dev`, `npm run build`, `npm run preview`
- Backend: `npm run dev`, `npm start`, `npm run seed`

### Données de démo
Pour (ré)initialiser la base avec 500 utilisateurs:
```bash
cd backend
npm run seed
```

Pour vérifier rapidement la base (derniers users, reports, etc.):
```bash
cd backend
node check_db.js
```

### NOTE
- Les commentaires en francais (//) sont a supprimer avant le rendu du projet et sont destines uniquement pour Carine
- Les commentaires en anglais (*/) ne sont pas a supprimer