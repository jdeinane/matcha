import React from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL, { withCredentials: true });

function App() {
	const [health, setHealth] = React.useState(null);
	const [socketMsg, setSocketMsg] = React.useState(null);

	React.useEffect(() => {
		fetch(`${API_URL}/api/health`, { credentials: "include" })
			.then((r) => r.json())
			.then(setHealth)
			.catch(() => setHealth({ ok: false }));
		
		socket.on("hello", (msg) => setSocketMsg(msg));
		socket.on("pong", () => setSocketMsg( {pong: true }));

		return () => {
			socket.off("hello");
			socket.off("pong");
			socket.disconnect();
		};
	}, []);

	return (
		<div style={{ fontFamily: "system-ui", padding: 24 }}>
			<h1>Matcha</h1>
			<p>API health: {health ? JSON.stringify(health) : "loading..."}</p>
			<p>Socket: {socketMsg ? JSON.stringify(socketMsg) : "loading..."}</p>
			<button onClick={() => socket.emit("ping")}>Ping socket</button>
		</div>
	);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
