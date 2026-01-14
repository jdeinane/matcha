import "dotenv/config";
import http from "http";
import { Server as IOServer } from "socket.io";
import { createApp } from "./app.js";
import "./db.js";
import { attachSockets } from "./socket.js";

const app = createApp();
const server = http.createServer(app);

const io = new IOServer(server, {
	cors: {
		origin: process.env.CORS_ORIGIN || "http://localhost:5173",
		credentials:true,
	},
});

attachSockets(io);

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
	console.log(`✅ Backend running on http://localhost:${port} ✅`);
});
