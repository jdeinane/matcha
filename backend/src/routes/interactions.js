import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { notifyUser } from "../socket.js";
import { sendEmail } from "../email.js";

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
			notifyUser(target_id, "notification", {
				type: "match",
				message: `Match with ${req.user.username}`,
				sender_id: liker_id
			});
			
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
			db.prepare(`
				UPDATE messages 
				SET is_read = 1 
				WHERE (sender_id = ? AND receiver_id = ?) 
				OR (sender_id = ? AND receiver_id = ?)
			`).run(liker_id, target_id, target_id, liker_id);

			// 2. Baisser la popularite si unliked (MIN 0)
			db.prepare("UPDATE users SET fame_rating = MAX(0, fame_rating - 5) WHERE id = ?").run(target_id);
		
			// 3. Envoi la notif (oui le sujet le sujet le demande meme si je trouve ca bizarre)
			db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'unlike')").run(target_id, liker_id);
			
			notifyUser(target_id, "notification", { 
				type: "unlike", 
				message: `${req.user.username} unliked you.`,
				sender_id: liker_id
			});

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

		// On verifie s'il y avait des like avant le blocage (pour ajuster la fame)
		const likeFromBlocker = db.prepare("SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?").get(blockerId, target_id);
		const likeFromTarget = db.prepare("SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?").get(target_id, blockerId);

		// Supprimer les likes
		db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(blockerId, target_id);
		db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(target_id, blockerId);

		// Ajuste la popularite en fonction du block et si y'avait like
		if (likeFromBlocker) {
					db.prepare("UPDATE users SET fame_rating = MAX(0, fame_rating - 5) WHERE id = ?").run(target_id);
				}

		if (likeFromTarget) {
					db.prepare("UPDATE users SET fame_rating = MAX(0, fame_rating - 5) WHERE id = ?").run(blockerId);
				}
				
		// Inserer le blocage
		db.prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)").run(blockerId, target_id);

		// Retirer les likes mutuels -> le blocage casse le match
		db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(blockerId, target_id);
		db.prepare("DELETE FROM likes WHERE liker_id = ? AND liked_id = ?").run(target_id, blockerId);

		db.prepare(`
				UPDATE messages 
				SET is_read = 1 
				WHERE (sender_id = ? AND receiver_id = ?) 
				OR (sender_id = ? AND receiver_id = ?)
			`).run(blockerId, target_id, target_id, blockerId);

		res.json({ success: true });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* GET BLOCKED USERS: List of blocked users */
router.get("/blocks", (req, res) => {
	try {
		const userId = req.user.id;
		const blockedUsers = db.prepare(`
			SELECT u.id, u.username, u.first_name, i.file_path as profile_pic
			FROM users u
			JOIN blocks b ON u.id = b.blocked_id
			LEFT JOIN images i ON u.id = i.user_id AND i.is_profile_pic = 1
			WHERE b.blocker_id = ?
		`).all(userId);

		res.json(blockedUsers);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* POST UNBLOCKED: Unblock user */
router.post("/unblock", (req, res) => {
	try {
		const { target_id } = req.body;
		const blockerId = req.user.id;

		db.prepare("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?")
			.run(blockerId, target_id);

		res.json({ success: true, message: "User unblocked" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* POST REPORT: Report user */
router.post("/report", async (req, res) => {
	try {
		const { target_id, reason } = req.body;
		const reporterId = req.user.id;

		db.prepare("INSERT OR IGNORE INTO reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)").run(reporterId, target_id, reason || "No reason");

		const reporter = db.prepare("SELECT username FROM users WHERE id = ?").get(reporterId);
		const reported = db.prepare("SELECT username, email FROM users WHERE id = ?").get(target_id);

		const adminEmail = "admin@matcha.com";
		const subject = `[REPORT] User Reported: ${reported.username}`;
		const html = `
			<h3>New User Report</h3>
			<p><strong>Reporter:</strong> ${reporter.username} (ID: ${reporterId})</p>
			<p><strong>Reported User:</strong> ${reported.username} (ID: ${target_id})</p>
			<p><strong>Reason:</strong> ${reason || "No reason provided"}</p>
			<br>
			<p>Please check the admin panel.</p>
		`;

		sendEmail(adminEmail, subject, html);

		res.json({ message: "User reported" });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
