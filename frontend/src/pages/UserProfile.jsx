import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const UserProfile = () => {
	const { id } = useParams();
	const { user: currentUser } = useAuth();

	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	const isOwnProfile = currentUser && currentUser.id === Number(id);

	const getImageUrl = (path) => {
		if (!path) return "https://via.placeholder.com/300?text=No+Photo";
		if (path.startsWith("http")) return path; 
		return `http://localhost:3000${path}`;
	};

	const fetchUser = useCallback(async () => {
		try {
			const res = await axios.get(`/api/browsing/user/${id}`);
			setUser(res.data);
			setLoading(false);
		} catch (error) {
			toast.error("User not found or blocked");
			navigate("/");
		}
	}, [id, navigate]);

	useEffect(() => {
		fetchUser();
	}, [fetchUser]);

	const handleLike = async () => {
		try {
			if (user.is_liked) {
				await axios.post("/api/interactions/unlike", { target_id: user.id });
				setUser({ ...user, is_liked: false, is_match: false, fame_rating: Math.max(0, user.fame_rating - 5) });
				toast.info("Unliked");
			} else {
				await axios.post("/api/interactions/like", { target_id: user.id });
				setUser({ ...user, is_liked: true, fame_rating: user.fame_rating + 5 });
				toast.success("Liked! 💖");
			}
		} catch (error) {
			toast.error("Action failed");
		}
	};

	const handleBlock = async () => {
		if (!window.confirm("Are you sure you want to block this user? You won't see them anymore."))
			return;

		try {
			await axios.post("/api/interactions/block", { target_id: user.id });
			toast.success("User blocked");
			navigate("/");
		} catch (error) {
			toast.error("Error blocking user");
		}
	};

	const handleReport = async () => {
		const reason = window.prompt("Why are you reporting this user?");
		if (!reason)
			return;

		try {
			await axios.post("/api/interactions/report", { target_id: user.id, reason});
			toast.success("User reported to admins");
		} catch (error) {
			toast.error("Error reporting user");
		}
	};

	if (loading)
		return <div className="container center">Loading profile...</div>;

	const profilePic = user.images.find(img => img.is_profile_pic)?.file_path;
	return (
		<div className="container" style={{ padding: '60px 20px' }}>
			<div className="profile-layout">
				<div>
					<img src={getImageUrl(profilePic)} alt={user.first_name} className="profile-image-main" />
					<div className="profile-gallery">
						{user.images.map(img => (
							<img key={img.id} src={getImageUrl(img.file_path)} className="gallery-thumb" alt="Gallery" />
						))}
					</div>
				</div>
				<div className="profile-info">
					<div style={{ marginBottom: '20px' }}>
						<h1 style={{ marginBottom: '5px' }}>{user.first_name}</h1>
						<span style={{ 
							fontFamily: 'var(--font-accent)', 
							fontSize: '0.8rem', 
							color: 'var(--text-muted)',
							textTransform: 'uppercase',
							letterSpacing: '0.1em'
						}}>
							@{user.username}
						</span>
					</div>
					<div className="profile-meta">
						<span className="status-indicator" style={{ background: user.is_online ? 'var(--matcha)' : '#ccc' }}></span>
						{user.is_online ? "Currently Online" : `Last seen ${user.last_seen || "recently"}`}
						<br /><br />
						{user.age} Years — Based in {user.city}
					</div>
					<div className="profile-section">
						<h3>About</h3>
						<p style={{ fontSize: '1.1rem', fontStyle: 'italic' }}>{user.biography || "Silence is my biography."}</p>
					</div>
					<div className="profile-section">
						<h3>Interests</h3>
						<div>{user.tags?.map(tag => <span key={tag} className="tag-pill">#{tag}</span>)}</div>
					</div>
					<div style={{ marginTop: '40px' }}>
						{isOwnProfile ? (
							<Link to="/settings" className="btn" style={{ width: '100%' }}>Edit My Archive</Link>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
								<div style={{ display: 'flex', gap: '10px' }}>
									<button 
										onClick={handleLike} 
										className="btn" 
										style={{ 
											flex: 1, 
											background: user.is_liked ? 'transparent' : 'var(--text-main)', 
											color: user.is_liked ? 'var(--text-main)' : 'var(--bg-body)' 
										}}
									>
										{user.is_liked ? "Unmatch" : "Match with her/him"}
									</button>
									{user.is_match && (
										<Link to="/chat" className="btn" style={{ flex: 1 }}>Send Message</Link>
									)}
								</div>
								<div style={{ display: 'flex', gap: '20px', marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px' }}>
									<button onClick={handleReport} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-accent)', fontSize: '0.6rem', cursor: 'pointer', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Report Account</button>
									<button onClick={handleBlock} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-accent)', fontSize: '0.6rem', cursor: 'pointer', textTransform: 'uppercase', color: '#ff4444' }}>Block User</button>
								</div>
							</div>
						)}
					</div>
					{user.is_match && !isOwnProfile && (
						<div style={{ marginTop: '30px', padding: '15px', border: '1px solid var(--matcha)', textAlign: 'center', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
							It's a Matcha! Your souls are connected.
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default UserProfile;
