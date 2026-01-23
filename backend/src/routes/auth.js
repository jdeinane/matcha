import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { db } from "../db.js";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas.js";
import { sendEmail } from "../email.js";

const router = express.Router();

if (!process.env.JWT_SECRET) {
	throw new Error("JWT_SECRET environment variable is required");
}

const JWT_SECRET = process.env.JWT_SECRET;
const clientUrl = process.env.CORS_ORIGIN || "http://localhost:3000";

/* REGISTER */
router.post("/register", async (req, res) => {
	try {
		// 1. Verifie les entrees (zod)
		const validatedData = registerSchema.parse(req.body);
		
		// 2. Verifie si l'utilisateur existe deja
		const userExists = db.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)").get(validatedData.username);
		if (userExists) {
			return res.json({ success: false, error: "This username is already taken" });
		}
		const emailExists = db.prepare("SELECT id FROM users WHERE email = ?").get(validatedData.email);
		if (emailExists) {
			return res.json({ success: false, error: "An account with this email already exists" });
		}

		// 3. Hachage du MDP
		const hashedPassword = await bcrypt.hash(validatedData.password, 10);

		// 4. Generation du token de verification (email)
		const verifyToken = crypto.randomBytes(32).toString("hex");

		// 5. Insertion en BDD
		const insertUser = db.prepare(`
			INSERT INTO users (username, email, first_name, last_name, password_hash, verify_token, verify_token_expires_at, birthdate)
			VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'), ?)
		`);

		insertUser.run(
			validatedData.username,
			validatedData.email,
			validatedData.first_name,
			validatedData.last_name,
			hashedPassword,
			verifyToken,
			validatedData.birthdate
		);

		const verifyLink = `${clientUrl}/verify/${verifyToken}`;
		await sendEmail(
			validatedData.email, 
			"Verify your Matcha account", 
			`<p>Welcome! Click here to verify your account: <a href="${verifyLink}">${verifyLink}</a></p>`
		);

		res.status(201).json({ message: "Successfully registered! Please verify your email."});
	
	} catch (error) {
		if (error.issues) {
			return res.json({ success: false, error: error.issues[0].message });
		}
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* VERIFY EMAIL */
router.post("/verify-email", (req, res) => {
	const { token } = req.body;
	if (!token) {
		return res.json({ success: false, error: "Missing token" });
	}

	const user = db.prepare(`
		SELECT id FROM users 
		WHERE verify_token = ? 
		AND (verify_token_expires_at > datetime('now') OR verify_token_expires_at IS NULL)
	`).get(token);

	if (!user) {
		return res.json({ success: false, error: "Invalid or expired token." });
	}

	// Met a jour l'utilisateur
	db.prepare(`
		UPDATE users 
		SET is_verified = 1, verify_token = NULL, verify_token_expires_at = NULL 
		WHERE id = ?
	`).run(user.id);

	res.json({ message: "Account verified successfully!" });
})

/* LOGIN */
router.post("/login", async (req, res) => {
	try {
		const { username, password } = loginSchema.parse(req.body);

		// 1. Recuperer l'utilisateur
		const user = db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)").get(username);

		// 2. Verifications de base
		if (!user || !(await bcrypt.compare(password, user.password_hash))) {
			return res.json({ success: false, error: "Invalid credentials." });
		}

		// 3. Verification du compte via email
		if (user.is_verified === 0) {
			return res.json({ success: false, error: "Please verify your email first." });
		}

		// 4. Pour une 1ere connexion: tant que l'user n'a pas defini ses preferences, sa loca, et sa PP
		// -> ON le renvoie dans /Settings
		const hasProfilePic = db.prepare("SELECT id FROM images WHERE user_id = ? AND is_profile_pic = 1").get(user.id);
		const hasLocation = user.latitude && user.longitude;
		const isComplete = !!(
			hasProfilePic && 
			user.latitude && 
			user.longitude && 
			user.gender && 
			user.sexual_preference
        );

		// 5. Creation du Token JWT
		const token = jwt.sign(
			{ id: user.id, username: user.username },
			JWT_SECRET,
			{ expiresIn: "24h" }
		);

		// 6. Envoi du cookie HTTP-Only (securite max contre XSS)
		res.cookie("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 24 * 60 * 60 * 1000
		});

		return res.json({ 
			token, 
			user: { 
				id: user.id, 
				username: user.username,
				is_complete: isComplete 
			},
			message: "Successfully connected."
		});

	} catch (error) {
		console.error(error);
		res.json({ success: false, error: "Invalid data or server error." });
	}
});

/* LOGOUT */
router.post("/logout", (req, res) => {
	res.clearCookie("token", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict"
	});
	res.json({ message: "Successfully disconnected."})
});

/* CHECK AUTH (for frontend) */
router.get("/me", (req, res) => {
	const token = req.cookies.token;
	if (!token) {
		return res.json({ authenticated: false, user: null });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);

		const user = db.prepare(`
			SELECT id, username, first_name, last_name, email, is_verified, gender, sexual_preference, latitude, longitude 
			FROM users WHERE id = ?
        `).get(decoded.id);

		if (!user) {
			return res.json({ authenticated: false });
		}

		const hasProfilePic = db.prepare("SELECT id FROM images WHERE user_id = ? AND is_profile_pic = 1").get(user.id);
		const isComplete = !!(
			hasProfilePic && 
			user.latitude && 
			user.longitude && 
			user.gender && 
			user.sexual_preference
		);

		const userToSend = {
			id: user.id,
			username: user.username,
			first_name: user.first_name,
			last_name: user.last_name,
			email: user.email,
			is_verified: user.is_verified,
			is_complete: isComplete
		};
		
		res.json({ authenticated: true, user: userToSend });
	
	} catch (err) {
		res.json({ authenticated: false, user: null });
	}
});

/* FORGOT PASSWORD */
router.post("/forgot-password", async (req, res) => {
	try {
		const { email } = forgotPasswordSchema.parse(req.body);

		const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
		if (!user)
			return res.json({ message: "If this email exists, a reset link has been sent."});

		// 1. Generer un token temp
		const resetToken = crypto.randomBytes(32).toString("hex");

		// 2. Sauvegarder le token DB avec expiration
		const updateToken = db.prepare(`
			UPDATE users
			SET reset_token = ?, reset_token_expires_at = datetime('now', '+1 hour')
			WHERE id = ?
		`)
		updateToken.run(resetToken, user.id);

		// 3. Envoyer l'email
		const resetLink = `${clientUrl}/reset-password/${resetToken}`;
		await sendEmail(
			email,
			"Reset your Password",
			`<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`
		);

		res.json({ message: "If this email exists, a reset link has been sent." });

	} catch (error) {
		if (error.issues)
			return res.json({ success: false, error: error.issues[0].message });
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

/* RESET PASSWORD */
router.post("/reset-password", async (req, res) => {
	try {
		const { token, newPassword } = resetPasswordSchema.parse(req.body);

		// 1. Trouver le user avec ce token valide et non expire
		const user = db.prepare(`
			SELECT id FROM users
			WHERE reset_token = ?
			AND reset_token_expires_at > datetime('now')
		`).get(token);

		if (!user)
			return res.json({ success: false, error: "Invalid or expired token." });

		// 2. Hacher le nouveau MDP
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// 3. Mettre a jour et nettoyer les tokens
		const updatePwd = db.prepare(`
			UPDATE users
			SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL
			WHERE id = ?
		`)
		updatePwd.run(hashedPassword, user.id);

		res.json({ message: "Password successfully reset. You can now login."});

	} catch (error) {
		if (error.issues)
			return res.json({ success: false, error: error.issues[0].message });
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
