import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const useSocket = () => {
	return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const { user } = useAuth();

	useEffect(() => {
		console.log("🔍 SocketContext: Auth check", { user: !!user });

		if (user) {
			console.log("🔌 SocketContext: Attempting connection via Cookie/Token...");
			
			const token = localStorage.getItem("token");

			const newSocket = io("http://localhost:3000", {
				query: token ? { token } : {},
				withCredentials: true,
				transports: ["websocket", "polling"]
			});

			newSocket.on("connect", () => {
				console.log("✅ Socket Connected! ID:", newSocket.id);
			});

			newSocket.on("connect_error", (err) => {
				console.error("❌ Socket Connection Error:", err.message);
			});

			setSocket(newSocket);

			return () => {
				console.log("🔌 SocketContext: Cleaning up...");
				newSocket.close();
				setSocket(null);
			};
		} 
		else {
			if (socket) {
				socket.close();
				setSocket(null);
			}
		}
	}, [user]); 

	return (
		<SocketContext.Provider value={socket}>
			{children}
		</SocketContext.Provider>
	);
};
