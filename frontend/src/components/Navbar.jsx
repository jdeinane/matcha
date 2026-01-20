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

	const navItemStyle = {
		cursor: 'pointer',
		fontFamily: 'var(--font-accent)',
		fontSize: '0.75rem',
		textTransform: 'uppercase',
		letterSpacing: '0.15em',
		color: '#F5F5DC', 
		display: 'flex',
		alignItems: 'center',
		textDecoration: 'none',
		background: 'none',
		border: 'none',
		padding: '5px 0',
		transition: 'opacity 0.2s ease',
		lineHeight: '1'
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
				<Link to="/chat" className="nav-link">Chat</Link>
				<Link to={`/user/${user.id}`} className="nav-link">Profile</Link>

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
							<span style={{ 
								backgroundColor: 'var(--matcha)', 
								color: 'white',
								marginLeft: '8px',
								fontSize: '0.6rem',
								minWidth: '18px',
								height: '18px',
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								borderRadius: '50%',
								fontWeight: 'bold',
								border: '1px solid #F5F5DC'
							}}>
								{unreadCount}
							</span>
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
