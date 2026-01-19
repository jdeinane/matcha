import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

import { useAuth, AuthProvider } from "./context/AuthContext";
import { SocketProvider, useSocket } from "./context/SocketContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Settings";
import Browsing from "./pages/Browsing";
import UserProfile from "./pages/UserProfile";
import Chat from "./pages/Chat";
import Search from './pages/Search';
import Home from './pages/Home';

const Navbar = () => {
	const socket = useSocket();
	const location = useLocation(); 
	const { user } = useAuth();

	const [unreadCount, setUnreadCount] = useState(0);
	const [showDropdown, setShowDropdown] = useState(false);
	const [notifications, setNotifications] = useState([]);

	const getMessage = (n) => {
		switch (n.type) {
			case "like": return "liked your profile.";
			case "visit": return "visited your profile.";
			case "match": return "You have a new match!";
			case "message": return "sent you a message.";
			case "unlike": return "unliked you.";
			default: return "New interaction.";
		}
	};

	useEffect(() => {
		axios.get("/api/notifications")
			.then(res => setUnreadCount(res.data.unreadCount))
			.catch(() => {});
	}, [location.pathname]);

	useEffect(() => {
		if (!socket) return;
		const handleNewNotif = () => setUnreadCount(prev => prev + 1);
		socket.on("notification", handleNewNotif);
		return () => socket.off("notification", handleNewNotif);
	}, [socket]);

	const handleToggleNotifs = async () => {
		if (!showDropdown) {
			try {
				const res = await axios.get("/api/notifications");
				setNotifications(res.data.notifications);
				
				setUnreadCount(0);
				await axios.put("/api/notifications/read");
			} catch (err) {
				console.error(err);
			}
		}
		setShowDropdown(!showDropdown);
	};

	return (
		<nav>
			<Link to="/" className="logo-text">Matcha.</Link>
			
			<div style={{display: 'flex', alignItems: 'center'}}>
				<Link to="/search">Search</Link>
				<Link to="/browse">Discover</Link>
				<Link to="/chat">Chat</Link>
				
				<div style={{position: 'relative', marginLeft: '25px'}}>
					<div 
						className="nav-item"
						onClick={handleToggleNotifs} 
						style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
					>
						Notifications
						{unreadCount > 0 && (
							<span className="notif-badge">{unreadCount}</span>
						)}
					</div>

					{showDropdown && (
						<div className="dropdown-menu">
							<h4>Recently</h4>
							
							{notifications.length === 0 ? (
								<p style={{padding: '30px', textAlign: 'center', fontFamily: 'var(--font-heading)', fontStyle: 'italic'}}>
									Aucune nouvelle notification.
								</p>
							) : (
								<div style={{display: 'flex', flexDirection: 'column'}}>
									{notifications.map(n => (
										<Link 
											key={n.id} 
											to={n.type === 'message' ? '/chat' : `/user/${n.sender_id}`}
											onClick={() => setShowDropdown(false)}
											className="dropdown-link"
											style={{ background: n.is_read ? 'transparent' : 'rgba(238, 231, 160, 0.15)' }}
										>
											<img 
												src={n.sender_pic ? `http://localhost:3000${n.sender_pic}` : "https://via.placeholder.com/40"} 
												alt="avatar"
											/>
											<div className="notif-content">
												<div className="notif-text">
													<strong>{n.sender_name}</strong> {getMessage(n)}
												</div>
												<span className="notif-time">
													{new Date(n.created_at).toLocaleDateString()}
												</span>
											</div>
										</Link>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				{user && (
					<>
						<Link to={`/user/${user.id}`}>Profile</Link>
						<Link to="/settings">Settings</Link>
					</>
				)}
			</div>
		</nav>
	);
};

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
