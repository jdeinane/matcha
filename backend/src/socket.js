import jwt from "jsonwebtoken";
import { db } from "./db.js";

/* System that identifies an user via its cookie, stores it in a list 'Map' of connected users,
	and allows to send targeted notifications. */

let ioInstance;

// Map pour stocker userId -> socketId
const connectedUsers = new Map()

export function attachSockets(io) {
	ioInstance = io;

	// Middleware d'auth Socket (je te conseille de demander a chatGPT c'est quoi 'middleware encapsulation for Socket.io')
	io.use((socket, next) => {
		try {
			// Recuperer le cookie 'token' depuis le header du handshake
			const cookieHeader = socket.handshake.headers.cookie;
			if (!cookieHeader)
				return next(new Error("Authentication error"));

			const cookies = Object.fromEntries(
				cookieHeader.split('; ').map(c => {
					const [key, ...v] = c.split('=');
					return [key, v.join('=')];
				})
			);

			const token = cookies['token'];
			if (!token)
				return next(new Error("Authentication error"));

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			socket.user = decoded; // on attache le user au socket
			next();

		} catch (err) {
			next(new Error("Authentication error"));
		}
	});

	io.on("connection", (socket) => {
		const userId = socket.user.id;
		console.log(`🟢 User connected: ${userId} (${socket.id})`);

		// 1. Enregistrer l'utilisateur comme connecte
		connectedUsers.set(userId, socket.id);

		// 2. Mettre a jour 'last_seen' a NULL (= en ligne maintenant)
		db.prepare("UPDATE users SET last_seen = NULL WHERE id = ?").run(userId);

		// 3. Gerer la deconnexion
		socket.on("disconnect", () => {
			console.log(`🔴 User disconnected: ${userId}`);
			connectedUsers.delete(userId);
			
			// Mettre a jour last_seen avec le timestamp actuel
			db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
		});
	});
}

/* HELPER: Sends notification to a specific user */
export function notifyUser(userId, type, payload) {
	if (!ioInstance)
		return;

	const socketId = connectedUsers.get(userId);
	if (socketId)
		ioInstance.to(socketId).emit(type, payload);
}

/* HELPER: Check if user is online */
export function isUserOnline(userId) {
	return connectedUsers.has(userId);
}
