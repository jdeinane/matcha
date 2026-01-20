import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

let io;
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
	console.log("🔌 Initializing Socket.io Server...");

	io = new Server(httpServer, {
		cors: {
			origin: process.env.CORS_ORIGIN || "http://localhost:5173",
			methods: ["GET", "POST"]
		}
	});

	io.use((socket, next) => {
		console.log(`⏳ New socket connection attempt: ${socket.id}`);
		
		let token = socket.handshake.query.token;
		
		if (!token && socket.handshake.headers.cookie) {
			console.log("   -> No query token, checking cookies...");
			const cookies = Object.fromEntries(
				socket.handshake.headers.cookie.split('; ').map(c => {
					const [key, ...v] = c.split('=');
					return [key, v.join('=')];
				})
			);
			token = cookies['token'];
		}

		if (!token) {
			console.log("   ❌ Authentication Failed: No token found.");
			return next(new Error("Authentication error"));
		}

		jwt.verify(token, process.env.JWT_SECRET || "secret_key", (err, decoded) => {
			if (err) {
				console.log(`   ❌ Authentication Failed: Invalid Token (${err.message})`);
				return next(new Error("Authentication error"));
			}
			console.log(`   ✅ Authentication Success for User ID: ${decoded.id}`);
			socket.user = decoded;
			next();
		});
	});

	io.on("connection", (socket) => {
		const userId = Number(socket.user.id);
		console.log(`🔗 User ${userId} fully connected on socket ${socket.id}`);

		onlineUsers.set(userId, socket.id);

		try {
			db.prepare("UPDATE users SET last_seen = NULL WHERE id = ?").run(userId);
		} catch (e) { console.error("Error updating last_seen:", e); }

		io.emit("userStatus", { userId, status: "online" });

		socket.on("messages_read", () => {
			socket.emit("messages_read");
		});

		socket.on("disconnect", () => {
			console.log(`❌ User ${userId} disconnected`);
			onlineUsers.delete(userId);
			try {
				db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
			} catch (e) { console.error(e); }
			io.emit("userStatus", { userId, status: "offline" });
		});
	});
};

export const notifyUser = (userId, event, data) => {
	if (!io) return;
	const targetId = Number(userId);
	const socketId = onlineUsers.get(targetId);

	if (socketId) {
		console.log(`📡 Sending '${event}' to User ${targetId} (Socket ${socketId})`);
		io.to(socketId).emit(event, data);
	} else {
		console.log(`⚠️ Failed to send '${event}': User ${targetId} is offline.`);
	}
};

export const isUserOnline = (userId) => {
	return onlineUsers.has(Number(userId));
};
