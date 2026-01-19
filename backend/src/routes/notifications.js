import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(verifyToken);

/* GET NOTIFICATIONS */
router.get("/", (req, res) => {
	try {
		const userId = req.user.id;

		const notifications = db.prepare(`
			SELECT n.id, n.type, n.is_read, n.created_at, 
				   u.username as sender_name, u.id as sender_id,
				   i.file_path as sender_pic
			FROM notifications n
			LEFT JOIN users u ON n.sender_id = u.id
			LEFT JOIN images i ON u.id = i.user_id AND i.is_profile_pic = 1
			WHERE n.recipient_id = ?
			ORDER BY n.created_at DESC
			LIMIT 50
		`).all(userId);

		const unreadCount = db.prepare(`
			SELECT count(*) as count FROM notifications 
			WHERE recipient_id = ? AND is_read = 0
		`).get(userId).count;

		res.json({ notifications, unreadCount });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* MARK AS READ*/
router.put("/read", (req, res) => {
	try {
		const userId = req.user.id;
		db.prepare("UPDATE notifications SET is_read = 1 WHERE recipient_id = ?").run(userId);
		res.json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
