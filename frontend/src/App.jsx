import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import axios from "axios";

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

const Navbar = () => {
	const socket = useSocket();
	const location = useLocation(); 
	
	const [unreadCount, setUnreadCount] = useState(0);
	const [showDropdown, setShowDropdown] = useState(false);
	const [notifications, setNotifications] = useState([]);

	const getIcon = (type) => {
		switch (type) {
			case "like": return "💖";
			case "visit": return "👀";
			case "match": return "🔥";
			case "message": return "💬";
			case "unlike": return "💔";
			default: return "🔔";
		}
	};

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
        <nav style={{ 
            padding: '15px 30px', 
            background: '#fff', 
            borderBottom: '1px solid #ddd', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            position: 'relative',
            zIndex: 100
        }}>
            <Link to="/" style={{fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: '#E91E63'}}>🍵 Matcha</Link>
            
            <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                <Link to="/" style={{textDecoration: 'none', color: '#333'}}>💞 Browse</Link>
                <Link to="/chat" style={{textDecoration: 'none', color: '#333'}}>💬 Chat</Link>
                
                <div style={{position: 'relative'}}>
                    <div 
                        onClick={handleToggleNotifs} 
                        style={{cursor: 'pointer', position: 'relative', color: '#333'}}
                    >
                        🔔 Notifs
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '-8px', right: '-10px',
                                background: 'red', color: 'white', fontSize: '0.7rem',
                                padding: '2px 6px', borderRadius: '50%', fontWeight: 'bold'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>

                    {showDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '40px',
                            right: '-50px',
                            width: '320px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                            zIndex: 1000
                        }}>
                            <h4 style={{padding: '10px 15px', margin: 0, borderBottom: '1px solid #eee', color: '#333'}}>Notifications</h4>
                            
                            {notifications.length === 0 ? (
                                <p style={{padding: '20px', textAlign: 'center', color: '#888', margin: 0}}>No notifications</p>
                            ) : (
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    {notifications.map(n => (
                                        <Link 
                                            key={n.id} 
                                            to={n.type === 'message' ? '/chat' : `/user/${n.sender_id}`}
                                            onClick={() => setShowDropdown(false)}
                                            style={{
                                                textDecoration: 'none', 
                                                color: '#333',
                                                padding: '10px 15px', 
                                                borderBottom: '1px solid #f5f5f5',
                                                background: n.is_read ? 'white' : '#e3f2fd',
                                                display: 'flex', alignItems: 'center', gap: '10px'
                                            }}
                                        >
                                            <div style={{fontSize: '1.2rem'}}>{getIcon(n.type)}</div>
                                            <img 
                                                src={n.sender_pic ? `http://localhost:3000${n.sender_pic}` : "https://via.placeholder.com/40"} 
                                                style={{width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover'}}
                                            />
                                            <div style={{fontSize: '0.9rem'}}>
                                                <strong>{n.sender_name}</strong> {getMessage(n)}
                                                <div style={{fontSize: '0.7rem', color: '#888', marginTop: '2px'}}>
                                                    {new Date(n.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <Link to="/profile" style={{textDecoration: 'none', color: '#333'}}>👤 My Profile</Link>
            </div>
        </nav>
    );
};

const Layout = () => {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
			<Navbar />
			<div style={{ flex: 1, width: '100%' }}> 
				<Outlet /> 
			</div>
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
								
								<Route path="/" element={<Browsing />} />
								<Route path="/profile" element={<Profile />} />
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
