import express from "express";
import { db } from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { updateAccountSchema, locationSchema, profileSchema } from "../schemas.js";

const router = express.Router();

/* MULTER CONFIGURATION (upload images) */
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const uploadPath = "uploads/";
		if (!fs.existsSync(uploadPath)) {
			fs.mkdirSync(uploadPath);
		}
		cb(null, uploadPath);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, uniqueSuffix + path.extname(file.originalname));
	}
});

const upload = multer({
	storage: storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const filetypes = /jpeg|jpg|png|webp/;
		const mimetype = filetypes.test(file.mimetype);
		const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
		if (mimetype && extname) {
			return cb(null, true);
		}
		cb(new Error("Only images (jpeg, jpg, png, webp) are allowed"));
	}
});

/* ROUTES PROTECTION */
router.use(verifyToken);

/* GET ME */
router.get("/profile", (req, res) => {
	try {
		const user = db.prepare(`
			SELECT id, username, first_name, last_name, email, gender, sexual_preference, biography, fame_rating, birthdate, latitude, longitude, city
			FROM users WHERE id = ?
		`).get(req.user.id);

		if (!user)
			return res.status(404).json({ error: "User not found" });
	
		const tags = db.prepare(`
			SELECT t.name FROM tags t
			JOIN user_tags ut ON ut.tag_id = t.id
			WHERE ut.user_id = ?
		`).all(user.id).map(t => t.name);

		const images = db.prepare(`
			SELECT id, file_path, is_profile_pic FROM images WHERE user_id = ?
		`).all(user.id);

		res.json({ ...user, tags, images });
	
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* PUT PROFILE */
router.put("/profile", (req, res) => {
	try {
		const { gender, sexual_preference, biography, tags, birthdate } = profileSchema.parse(req.body);

		const updateUser = db.prepare(`
			UPDATE users
			SET gender = ?, sexual_preference = ?, biography = ?, birthdate = ?
			WHERE id = ?
		`);
		updateUser.run(gender, sexual_preference, biography, birthdate || "", req.user.id);

		const deleteTags = db.prepare("DELETE FROM user_tags WHERE user_id = ?");
		deleteTags.run(req.user.id);

		if (tags && tags.length > 0) {
			const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)")
			const getTagId = db.prepare("SELECT id FROM tags WHERE name = ?");
			const linkTag = db.prepare("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)");

			const insertMany = db.transaction((tagList) => {
				for (const tagName of tagList) {
					const cleanTag = tagName.trim().toLowerCase();
					if (cleanTag.length < 2) continue;
					insertTag.run(cleanTag);
					const tagId = getTagId.get(cleanTag).id;
					linkTag.run(req.user.id, tagId);
				}
			});
			insertMany(tags);
		}

		res.json({ message: "Profile updated successfully" });

	} catch (error) {
		if (error.issues)
			return res.status(400).json({ error: error.issues[0].message });
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* POST PHOTO */
router.post("/photos", upload.single('image'), (req, res) => {
	if (!req.file)
		return res.status(400).json({ error: "No image uploaded" });

	try {
		const count = db.prepare("SELECT COUNT(*) as count FROM images WHERE user_id = ?").get(req.user.id);
		if (count.count >= 5) {
			fs.unlinkSync(req.file.path);
			return res.status(400).json({ error: "Maximum 5 photos allowed" });
		}

		const isFirst = count.count === 0 ? 1 : 0;
		const webPath = "/uploads/" + req.file.filename;

		const insertImage = db.prepare("INSERT INTO images (user_id, file_path, is_profile_pic) VALUES (?, ?, ?)");
		const info = insertImage.run(req.user.id, webPath, isFirst);

		res.status(201).json({
			message: "Image uploaded",
			image: { id: info.lastInsertRowid, url: webPath, is_profile_pic: isFirst},
		});

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* DELETE PHOTOS */
router.delete("/photos/:id", (req, res) => {
	try {
		const imageId = req.params.id;
		const image = db.prepare("SELECT * FROM images WHERE id = ? AND user_id = ?").get(imageId, req.user.id);

		if (!image)
			return res.status(404).json({ error: "Image not found" });

		const filename = path.basename(image.file_path);
		const fullPath = path.join("uploads", filename);

		if (fs.existsSync(fullPath))
			fs.unlinkSync(fullPath);

		db.prepare("DELETE FROM images WHERE id = ?").run(imageId);

		if (image.is_profile_pic === 1) {
			const nextImage = db.prepare("SELECT id FROM images WHERE user_id = ? LIMIT 1").get(req.user.id);
			if (nextImage)
				db.prepare("UPDATE images SET is_profile_pic = 1 WHERE id = ?").run(nextImage.id);
		}
		res.json({ message: "Image deleted" });

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* PUT SET PROFILE PIC */
router.put("/photos/:id/profile", (req, res) => {
	try {
		const imageId = req.params.id;
		const image = db.prepare("SELECT id FROM images WHERE id = ? AND user_id = ?").get(imageId, req.user.id);

		if (!image)
			return res.status(404).json({ error: "Image not found" });

		const setProfilePic = db.transaction(() => {
			db.prepare("UPDATE images SET is_profile_pic = 0 WHERE user_id = ?").run(req.user.id);
			db.prepare("UPDATE images SET is_profile_pic = 1 WHERE id = ?").run(imageId);
		});

		setProfilePic();
		res.json({ message: "Profile picture updated" });

	} catch (error) {
		res.status(500).json({ error: "Server error" });
	}
});

/* PUT ACCOUNT INFO */
router.put("/account", (req, res) => {
	try {
		const { email, first_name, last_name } = updateAccountSchema.parse(req.body);
		const currentUserId = req.user.id;

		// 1. Verifier si l'email est deja pris par un autre user
		if (email) {
			const emailExists = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, currentUserId);
			if (emailExists)
				return res.status(409).json({ error: "Email already in use."});
		}

		// 2. Construire la requete dynamique (on update que ce qui est envoye)
		const updates = [];
		const params = [];

		if (email) {
			updates.push("email = ?");
			params.push(email);
		}
		if (first_name) {
			updates.push("first_name = ?");
			params.push(first_name);
		}
		if (last_name) {
			updates.push("last_name = ?");
			params.push(last_name);
		}

		if (updates.length === 0)
			return res.json({ message: "Nothing to update." });

		params.push(currentUserId);

		const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
		db.prepare(query).run(...params);

		res.json({ message: "Account details updated successfully." });

	} catch (error) {
		if (error.issues)
			return res.status(400).json({ error: error.issues[0].message });
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* PUT LOCATION */
router.put("/location", (req, res) => {
	try {
		const { latitude, longitude, city } = locationSchema.parse(req.body);

		// Met a jour la position
		db.prepare("UPDATE users SET latitude = ?, longitude = ?, city = ? WHERE id = ?")
			.run(latitude, longitude, city || null, req.user.id);

		res.json({ message: "Location updated" });

	} catch (error) {
		if (error.issues) return res.status(400).json({ error: error.issues[0].message });
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* GET LIKERS (Who liked me) */
router.get("/likes", (req, res) => {
	try {
		// On recup les infos des gens qui ont like l'utilisateur connecte
		const likers = db.prepare(`
			SELECT u.id, u.username, u.fame_rating, i.file_path as profile_pic, l.created_at
			FROM likes l
			JOIN users u ON l.liker_id = u.id
			LEFT JOIN images i ON u.id = i.user_id AND i.is_profile_pic = 1
			WHERE l.liked_id = ?
		`).all(req.user.id);

		res.json(likers);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* GET VISITORS (Who visited me) */
router.get("/visits", (req, res) => {
	try {
		// On recup l'historique des visites
		const visitors = db.prepare(`
			SELECT u.id, u.username, u.fame_rating, i.file_path as profile_pic, v.created_at
			FROM visits v
			JOIN users u ON v.visitor_id = u.id
			LEFT JOIN images i ON u.id = i.user_id AND i.is_profile_pic = 1
			WHERE v.visited_id = ?
			ORDER BY v.created_at DESC
		`).all(req.user.id);

		res.json(visitors);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

router.delete("/account", verifyToken, async(req, res) => {
	const userId = req.user.id;

	try {
		// 1. Recuperer les photos pour les supprimer du disque si nescessaire
		const images = db.prepare("SELECT file_path FROM images WHERE user_id = ?").all(userId);

		// 2. Supprimer les donnees en cascade
		db.prepare("DELETE FROM users WHERE id = ?").run(userId);

		// 3. Detruire le cookie de session/token
		res.clearCookie("token");
		res.json({ message: "Account deleted successfully"});

	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to delete account" });
	}
});

export default router;
