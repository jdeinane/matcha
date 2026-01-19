import "dotenv/config";
import http from "http";
import { createApp } from "./app.js";
import "./db.js";
import { initSocket } from "./socket.js";

const app = createApp();
const server = http.createServer(app);


initSocket(server);

const port = Number(process.env.PORT || 3000);

server.listen(port, () => {
	console.log(`✅ Backend running on http://localhost:${port} ✅`);
});
