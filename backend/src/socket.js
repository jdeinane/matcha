export function attachSockets(io) {
	io.on("connection", (socket) => {
		socket.emit("hello", { ok: true });

		socket.on("ping", () => socket.emit("pong"));
	});
}
