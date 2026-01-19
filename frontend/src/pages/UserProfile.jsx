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

	return (
		<div className="container" style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
			
			{/* PROFILE HEADER */}
			<div className="card" style={{display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px'}}>
				<div style={{width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
					<img 
						src={getImageUrl(user.images.find(img => img.is_profile_pic)?.file_path)}
						alt={user.username}
						style={{width: '100%', height: '100%', objectFit: 'cover'}}
					/>
				</div>
				<div>
					<h1 style={{margin: 0}}>
						{user.first_name} {user.last_name} <span style={{fontSize: '1rem', color: '#666'}}>({user.age} yo)</span>
					</h1>
					<p style={{color: user.is_online ? 'green' : 'gray', fontWeight: 'bold'}}>
						{user.is_online ? "🟢 Online" : `Last seen: ${user.last_seen || "Unknown"}`}
					</p>
					<div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
						<span className="badge">⭐ {user.fame_rating} Fame</span>
						<span className="badge">📍 {user.city || "Unknown City"} ({user.distance ? Math.round(user.distance) : "?"} km)</span>
					</div>
				</div>
			</div>

		<div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
			{isOwnProfile ? (
				<Link 
					to="/settings" 
					className="btn" 
					style={{flex: 1, textAlign: 'center', backgroundColor: '#2196F3', textDecoration: 'none'}}
				>
					✏️ Edit My Profile
				</Link>
			) : (
				<>
					<button 
						onClick={handleLike} 
						className="btn" 
						style={{flex: 1, backgroundColor: user.is_liked ? '#e91e63' : '#ddd', color: user.is_liked ? 'white' : 'black'}}
					>
						{user.is_liked ? "💖 LIKED" : "🤍 LIKE"}
					</button>
					<button onClick={handleBlock} className="btn" style={{backgroundColor: '#333'}}>🚫 Block</button>
					<button onClick={handleReport} className="btn" style={{backgroundColor: '#f44336'}}>⚠️ Report</button>
				</>
			)}
			</div>

			{user.is_match && (
				<div style={{padding: '15px', background: '#e1bee7', color: '#4a148c', borderRadius: '8px', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold'}}>
					🎉 IT'S A MATCH! You can now chat.
				</div>
			)}

			{/* PHOTOS */}
			<div className="card" style={{marginBottom: '20px'}}>
				<h3>Gallery</h3>
				<div style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px'}}>
					{user.images.map(img => (
						<img 
							key={img.id} 
							src={getImageUrl(img.file_path)}
							alt={`${user.first_name}'s photo`}
							style={{height: '200px', borderRadius: '8px'}} 
						/>
					))}
				</div>
			</div>

			{/* DETAILS */}
			<div className="card">
				<h3>About Me</h3>
				<p>{user.biography || "No biography provided."}</p>
				
				<h3>Interests</h3>
				<div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
					{user.tags && user.tags.length > 0 ? (
						user.tags.map(tag => (
							<span key={tag} style={{background: '#eee', padding: '5px 10px', borderRadius: '15px', fontSize: '0.9rem'}}>#{tag}</span>
						))
					) : (
						<p style={{color: '#999'}}>No interests listed</p>
					)}
				</div>

				<h3>Info</h3>
				<p>Gender: {user.gender}</p>
				<p>Looking for: {user.sexual_preference}</p>
			</div>
		</div>
	);
};

export default UserProfile;
