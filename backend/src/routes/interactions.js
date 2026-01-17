import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { notifyUser } from "../socket.js";

const router = express.Router();
router.use(verifyToken);

/* POST LIKE: 'Like' user */
router.post("/like/:id", (req, res) => {
	try {
		const targetId = parseInt(req.params.id);
		const likerId = req.user.id;
		const likerName = req.user.username;

		if (targetId === likerId)
			return res.status(400).json({ error: "You cannot like yourself" });

		// Verifier si deja like
		const existingLike = db.prepare("SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?").get(likerId, targetId);
		if (existingLike)
			return res.json({ message: "Already liked"});

		// 1. Inserer le like
		db.prepare("INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)").run(likerId, targetId);

		// 2. Verifier si c'est un MATCH (like reciproque)
		const likedBack = db.prepare("SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?").get(targetId, likerId);

		if (likedBack) {
			// C'est un match -> creer une notif 'Match' pour les deux
			db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'match')").run(targetId, likerId);
			db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'match')").run(likerId, targetId);
			
			// Sockets
			notifyUser(targetId, "notification", { type: "match", sender_name:likerName });
			notifyUser(likerId, "notification", { type: "match", sender_name: "Someone" });

			return res.json({ message: "It's a match!", is_match: true });
		} else {
			// Juste un like simple -> Notif 'Like'
			db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'like')").run(targetId, likerId);
			// Popularite augmente -> +5 points pour un like recu
			db.prepare("UPDATE users SET fame_rating = fame_rating + 5 WHERE id = ?").run(targetId);

			// Socket
			notifyUser(targetId, "notification", { type: "like", sender_name: likerName });

			return res.json({ message: "Liked", is_match: false });
		}

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* DELETE LIKE: 'Unlike' */
router.delete("/like/:id", (req, res) => {
	try {
		const targetId = parseInt(req.params.id);
		const likerId = req.user.id;

		// 1. Supprimer le like
		const info = db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(likerId, targetId);

		if (info.changes > 0) {
			// 2. Envoyer une notif "Unlike"
			db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'unlike')").run(targetId, likerId);
			
			// 3. Baisser la popularite si unliked (MIN 0)
			db.prepare("UPDATE users SET fame_rating = CASE WHEN fame_rating - 5 < 0 THEN 0 ELSE fame_rating - 5 END WHERE id = ?").run(targetId);
		
			// Socket
			notifyUser(targetId, "notification", { type: "unlike", sender_name: req.user.username });
		}

		res.json({ message: "Unliked" });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* POST BLOCK: Block user */
router.post("/block/:id", (req, res) => {
	try {
		const targetId = parseInt(req.params.id);
		const blockerId = req.user.id;

		if (targetId === blockerId)
			return res.status(400).json({ error: "Cannot block yourself" });

		// Inserer le blocage
		db.prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)").run(blockerId, targetId);

		// Retirer les likes mutuels -> le blocage casse le match
		db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(blockerId, targetId);
		db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(targetId, blockerId);

		res.json({ message: "User blocked" });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* POST REPORT: Report user */
router.post("/report/:id", (req, res) => {
	try {
		const targetId = parseInt(req.params.id);
		const reporterId = req.user.id;
		const { reason } = req.body;

		// Inserer le signalement
		db.prepare("INSERT OR IGNORE INTO reports (reporter_id, reported_id) VALUES (?, ?)").run(reporterId, targetId);

		// TODO: Envoyer un mail a l'admin
		res.json({ message: "User reported" });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
