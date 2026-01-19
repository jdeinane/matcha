import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider, useSocket } from "./context/SocketContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import Browsing from "./pages/Browsing";
import UserProfile from "./pages/UserProfile";
import Chat from "./pages/Chat";

const Navbar = () => (
	<nav style={{
		padding: '15px 30px',
		background: '#fff',
		borderBottom: '1px solid #ddd',
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center'
	}}>
		<Link to="/" style={{fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: '#E91E63'}}>
			🍵 Matcha
		</Link>
		<div style={{display: 'flex', gap: '20px'}}>
			<Link to="/" style={{textDecoration: 'none', color: '#333'}}>💞 Browse</Link>
			<Link to="/profile" style={{textDecoration: 'none', color: '#333'}}>👤 My Profile</Link>
			{/* TODO: add logout here later */}
		</div>
	</nav>
);

const GlobalNotifications = () => {
	const socket = useSocket();

	useEffect(() => {
		if (!socket) return;

		const handleNotification = (data) => {
			if (data.type === 'match') toast.success(`💖 ${data.message}`);
			else if (data.type === 'like') toast.info(`👍 ${data.message}`);
			else if (data.type === 'message') toast.info(`💬 New message from ${data.sender_name}`);
			else toast.info(data.message);
		};

		socket.on("notification", handleNotification);

		return () => {
			socket.off("notification", handleNotification);
		};
	}, [socket]);

	return null;
};

function App() {
	return (
		<AuthProvider>
			<SocketProvider>
				<BrowserRouter>
					<ToastContainer position="bottom-right" theme="colored" />
					<GlobalNotifications />
					
					<Routes>
						<Route path="/login" element={<Login />} />
						<Route path="/register" element={<Register />} />
						<Route path="/verify/:token" element={<VerifyEmail />} />

						<Route element={<ProtectedRoute><Navbar /></ProtectedRoute>}>
							<Route path="/" element={<Browsing />} />
							<Route path="/profile" element={<Profile />} />
							<Route path="/user/:id" element={<UserProfile />} />
							<Route path="/chat" element={<Chat />} />
						</Route>

						<Route path="*" element={<Navigate to="/" />} />
					</Routes>
				</BrowserRouter>
			</SocketProvider>
		</AuthProvider>
	);
}

export default App;
