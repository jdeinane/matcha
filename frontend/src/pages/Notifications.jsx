import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const Notifications = () => {
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);

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
		const fetchNotifs = async () => {
			try {
				const res = await axios.get("/api/notifications");
				setNotifications(res.data.notifications);
				await axios.put("/api/notifications/read");
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchNotifs();
	}, []);

	if (loading) return <div className="container">Loading...</div>;

	return (
		<div className="container">
			<h2>Notifications</h2>

			{notifications.length === 0 ? (
				<p style={{ fontStyle: 'italic', color: '#666' }}>No recent activity.</p>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
					{notifications.map(n => (
						<Link
							key={n.id}
							to={n.type === 'message' ? '/chat' : `/user/${n.sender_id}`}
							style={{
								textDecoration: 'none',
								display: 'flex',
								alignItems: 'center',
								gap: '15px',
								padding: '15px',
								background: 'var(--bg-card)',
								border: '1px solid var(--text-main)',
								borderRadius: 'var(--radius)',
								color: 'var(--text-main)'
							}}
						>
							<img
								src={n.sender_pic ? `http://localhost:3000${n.sender_pic}` : "https://via.placeholder.com/50"}
								alt="avatar"
								style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
							/>
							<div>
								<div style={{ fontSize: '0.9rem' }}>
									<strong>{n.sender_name}</strong> {getMessage(n)}
								</div>
								<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '5px' }}>
									{new Date(n.created_at).toLocaleString()}
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
};

export default Notifications;
