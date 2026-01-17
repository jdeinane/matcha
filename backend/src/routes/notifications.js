import express from "express";
import { db } from "../db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(verifyToken);

/* GET NOTIFICATIONS */
router.get("/", (req, res) => {
	try {
		const notifications = db.prepare(`
			SELECT n.id, n.type, n.is_read, n.created_at, 
				u.username as sender_name, i.file_path as sender_pic
			FROM notifications n
			LEFT JOIN users u ON n.sender_id = u.id
			LEFT JOIN images i ON u.id = i.user_id AND i.is_profile_pic = 1
			WHERE n.recipient_id = ?
			ORDER BY n.created_at DESC
			LIMIT 50
		`).all(req.user.id);

		res.json(notifications);	

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* PUT MARK READ */
router.put("/read", (req, res) => {
	try {
		db.prepare("UPDATE notifications SET is_read = 1 WHERE recipient_id = ?").run(req.user.id);
		res.json({ message: "Notifications marked as read" });
	} catch (error) {
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
