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

/* REGISTER */
router.post("/register", async (req, res) => {
	try {
		// 1. Verifie les entrees (zod)
		const validatedData = registerSchema.parse(req.body);
		
		// 2. Verifie si l'utilisateur existe deja
		const userExists = db.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)").get(validatedData.username, validatedData.email);
		if (userExists) {
			return res.status(409).json({ error: "This username is already taken" });
		}
		const emailExists = db.prepare("SELECT id FROM users WHERE email = ?").get(validatedData.email);
		if (emailExists) {
			return res.status(409).json({ error: "An account with this email already exists" });
		}

		// 3. Hachage du MDP
		const hashedPassword = await bcrypt.hash(validatedData.password, 10);

		// 4. Generation du token de verification (email)
		const verifyToken = crypto.randomBytes(32).toString("hex");

		// 5. Insertion en BDD
		const insertUser = db.prepare(`
			INSERT INTO users (username, email, first_name, last_name, password_hash, verify_token)
			VALUES (?, ?, ?, ?, ?, ?)
		`);

		insertUser.run(
			validatedData.username,
			validatedData.email,
			validatedData.first_name,
			validatedData.last_name,
			hashedPassword,
			verifyToken
		);

		const verifyLink = `http://localhost:5173/verify/${verifyToken}`;
		await sendEmail(
			validatedData.email, 
			"Verify your Matcha account", 
			`<p>Welcome! Click here to verify your account: <a href="${verifyLink}">${verifyLink}</a></p>`
		);

		res.status(201).json({ message: "Successfully registered! Please verify your email."});
	
	} catch (error) {
		if (error.issues) {
			return res.status(400).json({ error: error.issues[0].message });
		}
		console.error(error);
		res.status(500).json({ error: "Server error." });
	}
});

/* VERIFY EMAIL */
router.post("/verify-email", (req, res) => {
	const { token } = req.body;
	if (!token) {
		return res.status(400).json({ error: "Missing token" });
	}

	const user = db.prepare("SELECT id FROM users WHERE verify_token = ?").get(token);
	if (!user) {
		return res.status(400).json({ error: "Invalid or expired token." });
	}

	// Met a jour l'utilisateur
	db.prepare("UPDATE users SET is_verified = 1, verify_token = NULL WHERE id = ?").run(user.id);

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
			return res.status(401).json({ error: "Invalid credentials." });
		}

		// Verification du compte via email
		if (user.is_verified === 0) {
			return res.status(403).json({ error: "Please verify your email first." });
		}

		// 3. Creation du Token JWT
		const token = jwt.sign(
			{ id: user.id, username: user.username },
			JWT_SECRET,
			{ expiresIn: "24h" }
		);

		// 4. Envoi du cookie HTTP-Only (securite max contre XSS)
		res.cookie("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 24 * 60 * 60 * 1000
		});

		res.json({ message: "Successfully connected.", user: { id: user.id, username: user.username }});

	} catch (error) {
		res.status(400).json({ error: "Invalid data." });
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
		return res.status(401).json({ authenticated: false });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);

		const user = db.prepare("SELECT id, username, first_name, last_name, email, is_verified FROM users WHERE id = ?").get(decoded.id);
		if (!user) {
			return res.status(401).json({ authenticated: false });
		}
		
		res.json({ authenticated: true, user });
	
	} catch (err) {
		res.status(401).json({ authenticated: false });
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
			SET reset_token = ?, reset_token_expires_at = datetime('now', '+1 hour)
			WHERE id = ?
		`)
		updateToken.run(resetToken, user.id);

		// 3. Envoyer l'email
		const resetLink = `http://localhost:5173/reset-password/${resetToken}`;
		await sendEmail(
			email,
			"Reset your Password",
			`<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`
		);

		res.json({ message: "If this email exists, a reset link has been sent." });

	} catch (error) {
		if (error.issues)
			return res.status(400).json({ error: error.issues[0].message });
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
			return res.status(400).json({ error: "Invalid or expired token." });

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
			return res.status(400).json({ error: error.issues[0].message });
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
