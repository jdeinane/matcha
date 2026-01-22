import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";

const UserProfile = () => {
	const { id } = useParams();
	const { user: currentUser } = useAuth();
	const socket = useSocket();

	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	const isOwnProfile = currentUser && currentUser.id === Number(id);

	const getImageUrl = (path) => {
		if (!path) return "https://via.placeholder.com/300?text=No+Photo";
		if (path.startsWith("http")) return path; 
		return `http://localhost:3000${path}`;
	};

	const DefaultAvatar = ({ name }) => (
		<div style={{
			width: '100%',
			aspectRatio: '3/4',
			backgroundColor: 'var(--accent)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: 'var(--radius)',
			border: '1px solid var(--text-main)'
		}}>
			<span style={{ 
				fontFamily: 'var(--font-heading)', 
				fontSize: '5rem', 
				color: 'var(--matcha)',
				fontStyle: 'italic'
			}}>
				{name ? name.charAt(0).toUpperCase() : 'M'}
			</span>
		</div>
	);

	const fetchUser = useCallback(async () => {
		try {
			const res = await axios.get(`/api/browsing/user/${id}`);
			
			if (res.data?.success === false || res.data?.error) {
				toast.error(res.data.error || "User not found or blocked");
				navigate("/");
				return;
			}
			
			setUser(res.data);
			setLoading(false);
		} catch (error) {
			toast.error(error.response?.data?.error || "User not found or blocked");
			navigate("/");
		}
	}, [id, navigate]);

	useEffect(() => {
		fetchUser();
	}, [fetchUser]);

	const handleLike = async () => {
		try {
			if (user.is_liked) {
				const res = await axios.post("/api/interactions/unlike", { target_id: user.id });
				
				if (res.data?.success === false || res.data?.error) {
					toast.error(res.data.error || "Failed to unlike");
					return;
				}
				
				setUser(prev => ({
					...prev,
					is_liked: false,
					is_match: false,
					fame_rating: Math.max(0, prev.fame_rating - 5)
				}));
				toast.info("Unliked");
			} else {
				const res = await axios.post("/api/interactions/like", { target_id: user.id });

				if (res.data?.success === false || res.data?.error) {
					toast.error(res.data.error || "Failed to like");
					return;
				}

				const hasMatched = res.data.is_match === true;

				setUser(prev => ({
					...prev,
					is_liked: true,
					is_match: hasMatched,
					fame_rating: prev.fame_rating + 5
				}));
			}
	
		} catch (error) {
			const errorMsg = error.response?.data?.error || "Action failed";
			toast.error(errorMsg);
		}
	};

	const handleBlock = async () => {
		if (!window.confirm("Are you sure you want to block this user? You won't see them anymore."))
			return;

		try {
			const res = await axios.post("/api/interactions/block", { target_id: user.id });
			
			if (res.data?.success === false || res.data?.error) {
				toast.error(res.data.error || "Error blocking user");
				return;
			}
			
			toast.success("User blocked");
			navigate("/");
		} catch (error) {
			toast.error(error.response?.data?.error || "Error blocking user");
		}
	};

	const handleReport = async () => {
		const reason = window.prompt("Why are you reporting this user?");
		if (!reason)
			return;

		try {
			const res = await axios.post("/api/interactions/report", { target_id: user.id, reason});
			
			if (res.data?.success === false || res.data?.error) {
				toast.error(res.data.error || "Error reporting user");
				return;
			}
			
			toast.success("User reported to admins");
		} catch (error) {
			toast.error(error.response?.data?.error || "Error reporting user");
		}
	};

	useEffect(() => {
		if (!socket || !user) return;

		const handleMatchUpdate = (data) => {
			if (data.type === 'match' && Number(id) === Number(data.sender_id)) {
				setUser(prev => ({
					...prev,
					is_match: true,
					is_liked: true
				}));
			}
		};

		const handleUnmatchUpdate = (data) => {
			if (Number(id) === Number(data.user_id)) {
				setUser(prev => ({
					...prev,
					is_match: false,
				}));
			}
		};

		socket.on("notification", handleMatchUpdate);
		socket.on("unmatch", handleUnmatchUpdate);

		return () => {
			socket.off("notification", handleMatchUpdate);
			socket.off("unmatch", handleUnmatchUpdate);
		};
	}, [socket, user, id]);

	if (loading)
		return <div className="container center">Loading profile...</div>;

	const profilePic = user.images.find(img => img.is_profile_pic)?.file_path;

	return (
		<div className="container" style={{ padding: '60px 20px' }}>
			<div className="profile-layout">
				<div>
					{profilePic ? (
						<img src={getImageUrl(profilePic)} alt={user.first_name} className="profile-image-main" />
					) : (
						<DefaultAvatar name={user.first_name} />
					)}
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
				<div className="profile-meta" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					{/* 1. Statut Online */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
						<span className="status-indicator" style={{ 
							background: user.is_online ? 'var(--matcha)' : '#ccc',
							width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block'
						}}></span>
						{user.is_online ? "Currently Online" : `Last seen ${user.last_seen || "recently"}`}
					</div>

					{/* 2. Bloc Infos Principales (Aligné et propre) */}
					<div style={{ 
						display: 'flex', 
						flexDirection: 'column', 
						gap: '4px', // Espace entre les lignes
						marginTop: '10px',
						fontFamily: 'var(--font-main)', // Assure la même police
						textTransform: 'uppercase',      // Tout en majuscule pour le style "clean"
						fontSize: '0.9rem',
						letterSpacing: '0.05em'
					}}>
						{/* Ligne 1 : Age + Genre + Orientation */}
						<div>
							{user.age} YEARS OLD <span style={{ color: 'var(--matcha)' }}>•</span> {user.gender} <span style={{ color: 'var(--matcha)' }}>•</span> {user.sexual_preference}
						</div>

						{/* Ligne 2 : Ville */}
						<div style={{ color: 'var(--text-muted)' }}>
							BASED IN {user.city}
						</div>
					</div>

					{/* 3. Popularité */}
					<div style={{ 
						marginTop: '15px', 
						fontSize: '0.7rem', 
						letterSpacing: '0.2em', 
						opacity: 0.8,
						paddingTop: '10px',
						width: 'fit-content'
					}}>
						POPULARITY SCORE: <span style={{ color: 'var(--matcha)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user.fame_rating}</span>
					</div>
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
						<Link to="/settings" className="btn" style={{ width: '30%', textAlign: 'center' }}>
							Edit Profile
						</Link>
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
									{user.is_match ? "Unmatch" : user.is_liked ? "Waiting for a match.." : "Connect"}
								</button>

								{user.is_match && (
									<Link to="/chat" className="btn" style={{ flex: 1, background: 'var(--matcha)', color: 'white' }}>
										Send Message
									</Link>
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
						It's a Matcha! You are connected.
					</div>
				)}
				</div>
			</div>
		</div>
	);
};

export default UserProfile;
