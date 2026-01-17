import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { notifyUser } from "../socket.js";
import { messageSchema } from "../schemas.js";

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

/* POST MESSAGE */
router.post("/", (req, res) => {
	try {
		const { recipient_id, content } = messageSchema.parse(req.body);
		const senderId = req.user.id;

		// 1. Verifier si Match
		const match = db.prepare(`
			SELECT count(*) as count FROM likes
			WHERE (liker_id = ? AND liked_id = ?) OR (liker_id = ? AND liked_id = ?)
		`).get(senderId, recipient_id, recipient_id, senderId);

		if (match.count < 2)
			return res.status(403).json({ error: "You must match to chat." });

		// 2. Inserer le message
		const insert = db.prepare(`
			INSERT INTO messages (sender_id, receiver_id, content)
			VALUES (?, ?, ?)	
		`);
		const info = insert.run(senderId, recipient_id, content);

		const newMessage = {
			id: info.lastInsertRowid,
			sender_id: senderId,
			content: content,
			created_at: new Date().toISOString(),
			is_read: 0
		};

		// 3. Notifier le destinataire ne temps reel via Socket
		notifyUser(recipient_id, "receiveMessage", newMessage);

		// 4. Lui envoyer une notif "Nouveau message"
		db.prepare("INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, 'message')").run(recipient_id, senderId);
		notifyUser(recipient_id, "notification", {
			type: "message",
			sender_name: req.user.username
		});

		res.status(201).json(newMessage);

	} catch (error) {
		if (error.issues)
			return res.status(400).json({ error: error.issues[0].message });
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
