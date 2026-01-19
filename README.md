## Matcha

Application de rencontre temps reel avec notifications, chat et gestion de profil. Projet full-stack (Vite/React + Express/SQLite) deployable en local.

### Stack tech
- Frontend : React, Vite, react-router-dom, react-hook-form, react-toastify, socket.io-client
- Backend : Express, SQLite (better-sqlite3), Zod pour la validation, JWT + cookies HTTP-only, Socket.io

### Structure
- [frontend/src](frontend/src) : React (routes, contexte auth, composants UI)
- [backend/src](backend/src) : Express (routes auth/users/chat, schemas Zod, socket)
- [backend/uploads](backend/uploads) : stockage des images utilisateur

### Prerequis
- Node.js >= 18
- npm (inclus avec Node)

### Installation rapide
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

### Scripts utiles
Frontend :
- `npm run dev` : demarrage Vite
- `npm run build` : build de production

Backend :
- `npm run dev` : serveur Express en watch
- `npm run seed` : seed de la base SQLite

### Variables d'environnement
Creer un fichier `.env` dans `backend/` avec au minimum :
```env
(voir .env.example)
```
Pour le frontend (`frontend/.env`) :
```env
(voir .env.example)
```

### Lancer le projet
Terminal 1 (backend) :
```bash
cd backend
npm run dev
```

Terminal 2 (frontend) :
```bash
cd frontend
npm run dev
```

L'appli est accessible sur `http://localhost:5173`.

### Donnees de demo
Pour remplir la base avec des donnees de test (500 random users):
```bash
cd backend
npm run seed
```

Pour verifier le contenu de la database et pour s'assurer que les nouveaux utilisateurs y sont bien inscrits:
```bash
cd backend
node check_db.js
```
### Fonctionnalites principales
Pour creer un compte utilisateur:
1. S'assurer que le backend tourne et que les logs s'y affichent
```bash
cd backend
npm run dev
```
2. Creer un compte directement sur la page `/register`
3. Aller sur le terminal du backend, il devrait y avoir un lien de validation
4. Cliquer sur le lien pour `verify account`
5. Retourner sur l'appli et se reconnecter

### Fonctionnalites principales
- Authentification avec verification email, reset de mot de passe
- Profil utilisateur : bio, tags, photos (upload, profil, suppression)
- Chat temps reel et notifications (via Socket.io)
- Protection des routes (middleware + contexte Auth côté frontend)
- A REMPLIR ...

### NOTE
- Les commentaires en francais (//) sont a supprimer avant le rendu du projet et sont destines uniquement pour Carine
- Les commentaires en anglais (*/) ne sont pas a supprimer

### TODO
- Implementer `last_seen_at`
- Implementer `get_user_city` a partir de la latitude/longitude definie par la geolocalisation (BONUS)