import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { notifyUser } from "../socket.js";

const router = express.Router();
router.use(verifyToken);

/* POST LIKE: 'Like' user */
router.post("/like", (req, res) => {
	try {
		const { target_id } = req.body;
		const liker_id = req.user.id;
		const hasPhoto = db.prepare("SELECT id FROM images WHERE user_id = ? AND is_profile_pic = 1").get(liker_id);

		if (!target_id || target_id === liker_id)
			return res.status(400).json({ error: "Invalid target" });

		if (!hasPhoto) {
			return res.status(403).json({ error: "You must have a profile picture to like users." });
		}

		const isBlocked = db.prepare(`
			SELECT 1 FROM blocks 
			WHERE (blocker_id = ? AND blocked_id = ?) 
			OR (blocker_id = ? AND blocked_id = ?)
		`).get(liker_id, target_id, target_id, liker_id);

		if (isBlocked)
			return res.status(403).json({ error: "Action not allowed (blocked)" });

		// Verifier si deja like
		const existingLike = db.prepare("SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?").get(liker_id, target_id);
		if (existingLike)
			return res.json({ message: "Already liked"});

		// 1. Inserer le like
		db.prepare("INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)").run(liker_id, target_id);

		// 2. Verifier si c'est un MATCH (like reciproque)
		const likedBack = db.prepare("SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?").get(target_id, liker_id);

		if (likedBack) {
			// C'est un match -> creer une notif 'Match' pour les deux
			db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'match')").run(target_id, liker_id);
			db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'match')").run(liker_id, target_id);
			
			// Sockets
			notifyUser(target_id, "notification", { type: "match", message: `Match with ${req.user.username}` });
			notifyUser(liker_id, "notification", { type: "match", message: "It's a Match!" });

			return res.json({ message: "It's a match!", is_match: true, success: true });
		} else {
			// Juste un like simple -> Notif 'Like'
			db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'like')").run(target_id, liker_id);
			// Popularite augmente -> +5 points pour un like recu
			db.prepare("UPDATE users SET fame_rating = fame_rating + 5 WHERE id = ?").run(target_id);

			// Socket
			notifyUser(target_id, "notification", { type: "like", message: `${req.user.username} liked you!` });

			return res.json({ message: "Liked", is_match: !!likedBack });
		}

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* DELETE LIKE: 'Unlike' */
router.post("/unlike", (req, res) => {
	try {
		const { target_id } = req.body;
		const liker_id = req.user.id;

		// 1. Supprimer le like
		const info = db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(liker_id, target_id);

		if (info.changes > 0) {
			
			// 2. Baisser la popularite si unliked (MIN 0)
			db.prepare("UPDATE users SET fame_rating = MAX(0, fame_rating - 5) WHERE id = ?").run(target_id);
		
			// Socket
			notifyUser(target_id, "unmatch", { user_id: liker_id });
		}

		res.json({ success: true });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* POST BLOCK: Block user */
router.post("/block", (req, res) => {
	try {
		const { target_id } = req.body;
		const blockerId = req.user.id;

		if (target_id === blockerId)
			return res.status(400).json({ error: "Cannot block yourself" });

		// Inserer le blocage
		db.prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)").run(blockerId, target_id);

		// Retirer les likes mutuels -> le blocage casse le match
		db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(blockerId, target_id);
		db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(target_id, blockerId);

		res.json({ success: true });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* POST REPORT: Report user */
router.post("/report", (req, res) => {
	try {
		const { target_id, reason } = req.body;
		const reporterId = req.user.id;

		// Inserer le signalement
		db.prepare("INSERT OR IGNORE INTO reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)").run(reporterId, target_id, reason || "No reason");

		// TODO: Envoyer un mail a l'admin
		res.json({ message: "User reported" });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
