import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(verifyToken);

/* GET CONVERSATION */
router.get("/:userId", (req, res) => {
	try {
		const currentUserId = req.user.id;
		const targetId = parseInt(req.params.userId);

		// Verification: est-ce qu'ils ont match? -> on verifie dans la table likes si le match existe encore
		const match = db.prepare(`
			SELECT count(*) as count FROM likes 
			WHERE (liker_id = ? AND liked_id = ?) OR (liker_id = ? AND liked_id = ?)
		`).get(currentUserId, targetId, targetId, currentUserId);

		// Verifie s'il y a 2 likes (Match) -> si count < 2, ils ne sont plus matches
		if (match.count < 2)
			return res.status(403).json({ error: "You must match to chat." });

		const messages = db.prepare(`
			SELECT id, sender_id, content, created_at, is_read 
			FROM messages 
			WHERE (sender_id = ? AND receiver_id = ?) 
			OR (sender_id = ? AND receiver_id = ?)
			ORDER BY created_at ASC
		`).all(currentUserId, targetId, targetId, currentUserId);

		res.json(messages);

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
