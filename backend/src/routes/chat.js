import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { notifyUser } from "../socket.js";
import { messageSchema } from "../schemas.js";

const router = express.Router();
router.use(verifyToken);

/* GET CONVERSATION */
router.get("/conversations", (req, res) => {
	try {
		const userId = req.user.id;

		// On cherche les users avec qui il y a Match (like mutuel)
		const matches = db.prepare(`
			SELECT u.id, u.username, u.first_name, u.last_name, i.file_path as profile_pic, u.last_seen
			FROM users u
			JOIN likes l1 ON l1.liker_id = u.id AND l1.liked_id = ?
			JOIN likes l2 ON l2.liker_id = ? AND l2.liked_id = u.id
			LEFT JOIN images i ON u.id = i.user_id AND i.is_profile_pic = 1
		`).all(userId, userId);

		// Pour chaque match, on recup le dernier message pour l'apercu
		const conversations = matches.map(match => {
			const lastMsg = db.prepare(`
				SELECT content, sender_id, created_at, is_read 
				FROM messages 
				WHERE (sender_id = ? AND receiver_id = ?) 
				OR (sender_id = ? AND receiver_id = ?)
				ORDER BY created_at DESC LIMIT 1
			`).get(userId, match.id, match.id, userId);

			// Compte les messages non lus
			const unread = db.prepare(`
				SELECT COUNT(*) as count FROM messages 
				WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
			`).get(match.id, userId);

			return { ...match, lastMessage: lastMsg || null, unreadCount: unread.count };
		});

		res.json(conversations);

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* TO COUNT CHAT NOTIFS TO RENDER IN THE NAVBAR */
router.get("/unread-total", (req, res) => {
	const unread = db.prepare(`
		SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0
	`).get(req.user.id);
    res.json({ total: unread.count });
});

/* GET MESSAGES (History) */
router.get("/messages/:id", (req, res) => {
	try {
		const currentUserId = req.user.id;
		const targetId = parseInt(req.params.id);

		// Verif Match
		const match = db.prepare(`
			SELECT count(*) as count FROM likes 
			WHERE (liker_id = ? AND liked_id = ?) OR (liker_id = ? AND liked_id = ?)
		`).get(currentUserId, targetId, targetId, currentUserId);

		if (match.count < 2)
			return res.json({ error: "You must match to chat." });

		const messages = db.prepare(`
			SELECT id, sender_id, content, created_at, is_read 
			FROM messages 
			WHERE (sender_id = ? AND receiver_id = ?) 
			   OR (sender_id = ? AND receiver_id = ?)
			ORDER BY created_at ASC
		`).all(currentUserId, targetId, targetId, currentUserId);

		// Marquer comme lu
		db.prepare(`UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?`)
		  .run(currentUserId, targetId);

		res.json(messages);

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* POST MESSAGE (Send) */
router.post("/messages/:id", (req, res) => {
	try {
		const recipient_id = parseInt(req.params.id);
		const { content } = messageSchema.pick({ content: true }).parse(req.body);
		const senderId = req.user.id;

		if (!content || !content.trim()) 
			return res.json({ error: "Message empty" });

		// Verif Match
		const match = db.prepare(`
			SELECT count(*) as count FROM likes
			WHERE (liker_id = ? AND liked_id = ?) OR (liker_id = ? AND liked_id = ?)
		`).get(senderId, recipient_id, recipient_id, senderId);

		if (match.count < 2)
			return res.json({ error: "You must match to chat." });

		// Insertion
		const insert = db.prepare(`
			INSERT INTO messages (sender_id, receiver_id, content)
			VALUES (?, ?, ?)    
		`);
		const info = insert.run(senderId, recipient_id, content);

		const newMessage = {
			id: info.lastInsertRowid,
			sender_id: senderId,
			sender_name: req.user.username,
			receiver_id: recipient_id,
			content: content,
			type: 'message',
			created_at: new Date().toISOString(),
			is_read: 0
		};

		notifyUser(recipient_id, "message", newMessage);

		res.status(201).json(newMessage);

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
