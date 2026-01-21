import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { notifyUser, isUserOnline } from "../socket.js";

const router = express.Router();

router.use(verifyToken);

/* HELPER: Distance calculation (Harversine Formula) */

// Retourne la distance en km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
	if (!lat1 || !lon1 || !lon2 || !lat2)
		return null;

	const R = 6371;
	const dLat = (lat2 - lat1) * (Math.PI / 180);
	const dLon = (lon2 - lon1) * (Math.PI / 180);
	const a = 
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/* HELPER: Age calculation */
const calculateAge = (birthdate) => {
	if (!birthdate)
		return 18;
	
	const today = new Date();
	const birthDate = new Date(birthdate);
	let age = today.getFullYear() - birthDate.getFullYear();
	const m = today.getMonth() - birthDate.getMonth();

	if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
		age--;
	return age;
}

/* GET SUGGESTIONS: Matching Algorithm */
router.get("/suggestions", (req, res) => {
	try {
		const currentUserId = req.user.id;

		// 1. Recuperer mon profil complet
		const me = db.prepare("SELECT * FROM users WHERE id = ?").get(currentUserId);
		if (!me)
			return res.status(404).json({ error: "User profile not found. Please login again." });

		if (!me.latitude || !me.longitude) {
			me.latitude = 0;
			me.longitude = 0;
		}

		// Recuperer mes tags (IDs) pour comparer
		const myTags = db.prepare("SELECT tag_id FROM user_tags WHERE user_id = ?").all(currentUserId).map(t => t.tag_id);

		// 2. Definir qui on cherche (Orientation)
		let genderCondition = "";
		const params = [currentUserId];

		// Gestion (basique) de l'orientation
		if (me.sexual_preference === 'heterosexual') {
			genderCondition = "AND gender != ?";
			params.push(me.gender); // Cherche le genre oppose
		} else if (me.sexual_preference === 'gay') {
			genderCondition = "AND gender = ?";
			params.push(me.gender); // Cherche le meme genre
		} // Si bi -> pas de restriction

		// 3. Recuperer les candidats potentiels
		// On exclut soi-meme et les comptes non verifies
		const query = `
			SELECT users.id, username, first_name, birthdate, gender, fame_rating, latitude, longitude, file_path as profile_pic
			FROM users
			LEFT JOIN images ON users.id = images.user_id AND images.is_profile_pic = 1
			WHERE users.id != ?
			AND is_verified = 1
			${genderCondition}
			AND users.id IN (SELECT user_id FROM images WHERE is_profile_pic = 1)
			AND users.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
			AND users.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
		`;

		// Ajout des params pour les blocks
		params.push(currentUserId, currentUserId);

		const candidates = db.prepare(query).all(...params);

		// 4. Scoring et Filtrage (algo)
		const scoredCandidates = candidates.map(user => {
			const distance = calculateDistance(me.latitude, me.longitude, user.latitude, user.longitude);

			const age = calculateAge(user.birthdate);

			const userTagIds = db.prepare("SELECT tag_id FROM user_tags WHERE user_id = ?").all(user.id).map(t => t.tag_id);
			const commonTags = userTagIds.filter(id => myTags.includes(id)).length;
			const tags = db.prepare(`
					SELECT t.name FROM tags t
					JOIN user_tags ut ON ut.tag_id = t.id
					WHERE ut.user_id = ?
				`).all(user.id).map(t => t.name);

			// SCORE DE MATCHING
			// Algo exemple:
			// - Distance : max 100 points (- c'est loin, + ca rapporte)
			// - Tags: 10 points par tag commun
			// - Fame: 10% de la note de popularite
			let score = 0;

			if (distance !== null)
				score += Math.max(0, 100 - distance);

			score += commonTags * 20;
			
			score += (user.fame_rating || 0) * 0.5;

			return { ...user, distance, age, commonTags, score, tags };
		});

		// 5. Trier par Score (descendant)
		scoredCandidates.sort((a, b) => b.score - a.score);

		res.json(scoredCandidates);

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* GET SEARCH: Advanced Research */
router.get("/search", (req, res) => {
	try {
		const { ageMin, ageMax, fameMin, fameMax, distanceMax, tags } = req.query;
		const currentUserId = req.user.id;
		const me = db.prepare("SELECT latitude, longitude FROM users WHERE id = ?").get(currentUserId);

		// On recupere tout le monde (sauf soi et bloques) et on filtre en JS
		// Optimisation possible: ajouter des WHERE SQL pour fame/age si possible
		const users = db.prepare(`
			SELECT u.id, u.username, u.first_name, u.birthdate, u.fame_rating, u.latitude, u.longitude, i.file_path as profile_pic
			FROM users u
			LEFT JOIN images i ON u.id = i.user_id AND i.is_profile_pic = 1
			WHERE u.id != ?
			AND u.is_verified = 1
			AND u.id IN (SELECT user_id FROM images WHERE is_profile_pic = 1)
			AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
			AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
		`).all(currentUserId, currentUserId, currentUserId);

		const filtered = users.map(user => {
			const age = calculateAge(user.birthdate);
			const distance = calculateDistance(me.latitude, me.longitude, user.latitude, user.longitude);
			const userTags = db.prepare(`
				SELECT t.name FROM tags t
				JOIN user_tags ut ON ut.tag_id = t.id
				WHERE ut.user_id = ?
			`).all(user.id).map(t => t.name);

			return { ...user, age, distance, tags: userTags };
		}).filter(user => {
			if (ageMin && user.age < Number(ageMin)) return false;
			if (ageMax && user.age > Number(ageMax)) return false;
			if (fameMin && user.fame_rating < Number(fameMin)) return false;
			if (fameMax && user.fame_rating > Number(fameMax)) return false;
			if (distanceMax && user.distance > Number(distanceMax)) return false;

			if (tags) {
				const tagsArray = typeof tags === 'string' ? [tags] : tags;
				const hasAllTags = tagsArray.every(reqTag => user.tags.includes(reqTag));
				if (!hasAllTags) return false;
			}
			return true;
		});

		res.json(filtered);

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* GET USER PROFILE (PUBLIC): Visit a profile */
router.get("/user/:id", (req, res) => {
	try {
		const targetId = parseInt(req.params.id);
		const visitorId = req.user.id;
		const blockCheck = db.prepare(`
			SELECT 1 FROM blocks 
			WHERE (blocker_id = ? AND blocked_id = ?) 
			OR (blocker_id = ? AND blocked_id = ?)
		`).get(visitorId, targetId, targetId, visitorId);

		if (blockCheck) {
			return res.status(403).json({ error: "User not found or blocked" });
		}

		// 1. Recuperer le user
		const user = db.prepare(`
			SELECT id, username, first_name, last_name, gender, sexual_preference, biography, fame_rating, last_seen, latitude, longitude, city, birthdate
			FROM users WHERE id = ?
		`).get(targetId);

		if (!user)
			return res.status(404).json({ error: "User not found" });

		// 2. Infos supplementaires (tags, images)
		user.age = calculateAge(user.birthdate);
		user.tags = db.prepare("SELECT t.name FROM tags t JOIN user_tags ut ON ut.tag_id = t.id WHERE ut.user_id = ?").all(targetId).map(t => t.name);
		user.images = db.prepare("SELECT id, file_path, is_profile_pic FROM images WHERE user_id = ?").all(targetId);

		// 3. Statut de la relation (like, bloque, online...)
		const like = db.prepare("SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?").get(visitorId, targetId);
		const likedBack = db.prepare("SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?").get(targetId, visitorId);
        
		user.is_liked = !!like;
		user.is_match = !!(like && likedBack); 

		user.is_online = isUserOnline(targetId);

		// 4. Enregistrer la visite (historique)
		// On verifie si une visite recente existe deja pour pas spam la DB
		if (visitorId !== targetId) {
			const isBlocked = db.prepare(`
				SELECT 1 FROM blocks 
				WHERE (blocker_id = ? AND blocked_id = ?) 
				OR (blocker_id = ? AND blocked_id = ?)
			`).get(visitorId, targetId, targetId, visitorId);

			if (!isBlocked) {
				const existingVisit = db.prepare("SELECT id FROM visits WHERE visitor_id = ? AND visited_id = ? AND created_at > datetime('now', '-1 hour')").get(visitorId, targetId);

				if (!existingVisit && visitorId !== targetId) {
					db.prepare("INSERT INTO visits (visitor_id, visited_id) VALUES (?, ?)").run(visitorId, targetId);
					db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'visit')").run(targetId, visitorId);
					db.prepare("UPDATE users SET fame_rating = fame_rating + 1 WHERE id = ?").run(targetId);
					
					// Socket
					notifyUser(targetId, "notification", { type: "visit", sender_name: req.user.username, sender_id: visitorId });
				}
			}
		}
		
		res.json(user);
	
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
