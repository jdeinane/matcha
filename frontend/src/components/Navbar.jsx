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

	// CONFIGURATION DU STYLE CRÈME ET AGRANDI
	const iconStyle = {
		cursor: 'pointer',
		fontSize: '1.6rem', // Taille augmentée pour la visibilité
		display: 'flex',
		alignItems: 'center',
		color: '#F5F5DC',   // Couleur Crème harmonisée
		transition: 'all 0.2s ease-in-out',
		background: 'none',
		border: 'none',
		padding: '5px',
		textDecoration: 'none',
		lineHeight: '1'
	};

	return (
		<nav>
			<Link to="/" className="logo-text">Matcha.</Link>
			
			<div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
				<Link to="/search" className="nav-link">Search</Link>
				<Link to="/browse" className="nav-link">Discover</Link>
				<Link to="/chat" className="nav-link">Chat</Link>
				<Link to={`/user/${user.id}`} className="nav-link">Profile</Link>
				
				<Link to="/settings" style={iconStyle} title="Settings" className="nav-icon-hover">
					⚙
				</Link>

				<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
					<div 
						onClick={handleToggleNotifs} 
						style={iconStyle}
						title="Notifications"
						className="nav-icon-hover"
					>
						{unreadCount > 0 ? "🔔" : "🛎"}
						{unreadCount > 0 && (
							<span className="notif-badge" style={{ 
								backgroundColor: 'var(--matcha)', 
								color: 'white',
								top: '-2px',
								right: '-2px',
								fontSize: '0.6rem',
								minWidth: '16px',
								height: '16px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							}}>
								{unreadCount}
							</span>
						)}
					</div>

					{showDropdown && (
						<div className="dropdown-menu">
							<h4>Recently</h4>
							{notifications.length === 0 ? (
								<p style={{ padding: '30px', textAlign: 'center', fontStyle: 'italic' }}>
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
				<button 
					onClick={logout}
					style={iconStyle}
					title="Logout"
					className="nav-icon-hover"
				>
					⏻
				</button>
			</div>
		</nav>
	);
};

export default Navbar;
