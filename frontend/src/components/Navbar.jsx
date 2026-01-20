import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const Navbar = () => {
	const socket = useSocket();
	const location = useLocation();
	const { user, logout } = useAuth();

	const [unreadCount, setUnreadCount] = useState(0);
	const [unreadChatCount, setUnreadChatCount] = useState(0);
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
		if (!user) return;
		axios.get("/api/notifications")
			.then(res => setUnreadCount(res.data.unreadCount))
			.catch(() => {});
	}, [location.pathname, user]);

	useEffect(() => {
		if (!user) return;
		
		const fetchUnread = () => {
			axios.get("/api/chat/unread-total").then(res => setUnreadChatCount(res.data.total));
		};

		fetchUnread();

		if (location.pathname === '/chat') {
			setUnreadChatCount(0);
		}
	}, [location.pathname, user]);

	useEffect(() => {
		if (!socket) return;

		const handleReadUpdate = () => {
			axios.get("/api/chat/unread-total").then(res => setUnreadChatCount(res.data.total));
		};

		const handleNewMsg = () => {
			if (location.pathname !== '/chat') {
				setUnreadChatCount(prev => prev + 1);
			}
		};

		socket.on("message", handleNewMsg);
		socket.on("messages_read", handleReadUpdate);

		return () => {
			socket.off("message", handleNewMsg);
			socket.off("messages_read", handleReadUpdate);
		};
	}, [socket, location.pathname]);

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

	if (!user) return null;

	const badgeStyle = {
		marginLeft: '8px',
		backgroundColor: '#F5F5DC',
		color: 'var(--matcha)',
		fontSize: '0.6rem',
		padding: '2px 6px',
		borderRadius: '10px',
		fontWeight: 'bold',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: '16px'
	};

	const iconOnlyStyle = {
		cursor: 'pointer',
		color: '#F5F5DC', 
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		background: 'none',
		border: 'none',
		padding: '0',
		marginLeft: '25px',
		fontSize: '1.1rem',
		transition: 'opacity 0.3s',
		lineHeight: '1'
	};

	return (
		<nav>
			<Link to="/" className="logo-text">Matcha.</Link>
			
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<Link to="/search" className="nav-link">Search</Link>
				<Link to="/browse" className="nav-link">Discover</Link>
				<Link to={`/user/${user.id}`} className="nav-link">Profile</Link>
				<Link to="/chat" className="nav-link" style={{ display: 'flex', alignItems: 'center' }}>
					Chat
					{unreadChatCount > 0 && (
						<span style={badgeStyle}>{unreadChatCount}</span>
					)}
				</Link>

				<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
					<button 
						onClick={handleToggleNotifs} 
						className="nav-item"
						style={{ 
							background: 'none', 
							border: 'none', 
							padding: 0, 
							color: '#F5F5DC',
							display: 'flex',
							alignItems: 'center'
						}}
						>
						Notifs
						{unreadCount > 0 && (
							<span style={badgeStyle}>{unreadCount}</span>
						)}
					</button>

					{showDropdown && (
						<div className="dropdown-menu">
							<h4>Recently</h4>
							{notifications.length === 0 ? (
								<p style={{ padding: '30px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-main)', textTransform: 'none', letterSpacing: 'normal' }}>
									Nothing going on here.
								</p>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column' }}>
									{notifications.map(n => (
										<Link 
											key={n.id} 
											to={n.type === 'message' ? '/chat' : `/user/${n.sender_id}`}
											onClick={() => setShowDropdown(false)}
											className="dropdown-link"
										>
											<img 
												src={n.sender_pic ? `http://localhost:3000${n.sender_pic}` : "https://via.placeholder.com/40"} 
												alt="avatar"
											/>
											<div className="notif-content">
												<div className="notif-text">
													<strong>{n.sender_name}</strong> {getMessage(n)}
												</div>
												<span className="notif-time">{new Date(n.created_at).toLocaleDateString()}</span>
											</div>
										</Link>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				<Link to="/settings" style={iconOnlyStyle} title="Settings" className="nav-item-icon">
					⚙
				</Link>

				<button 
					onClick={logout}
					style={{ ...iconOnlyStyle, fontSize: '0.9rem' }}
					title="Logout"
				>
					⏻
				</button>
			</div>
		</nav>
	);
};

export default Navbar;
