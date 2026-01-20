import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider, useSocket } from "./context/SocketContext";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Settings";
import Browsing from "./pages/Browsing";
import UserProfile from "./pages/UserProfile";
import Chat from "./pages/Chat";
import Search from './pages/Search';
import Home from './pages/Home';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const Footer = () => (
	<footer style={{ textAlign: 'center', padding: '40px', marginTop: 'auto', fontFamily: 'var(--font-accent)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
		© 2026 Matcha — 42 Paris
	</footer>
);

const Layout = () => {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
			<Navbar />
			<div style={{ flex: 1, width: '100%' }}> 
				<Outlet /> 
			</div>
			<Footer />
		</div>
	);
};

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
		return () => socket.off("notification", handleNotification);
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
						<Route path="/forgot-password" element={<ForgotPassword />} />
						<Route path="/reset-password/:token" element={<ResetPassword />} />
						
						<Route element={<ProtectedRoute />}>
							
							<Route element={<Layout />}>
								
								<Route path="/" element={<Home />} />
								<Route path="/browse" element={<Browsing />} />
								<Route path="/search" element={<Search />} />
								<Route path="/settings" element={<Profile />} />
								<Route path="/user/:id" element={<UserProfile />} />
								<Route path="/chat" element={<Chat />} />
								
							</Route>
						</Route>

						<Route path="*" element={<Navigate to="/" />} />
					</Routes>
				</BrowserRouter>
			</SocketProvider>
		</AuthProvider>
	);
}

export default App;
