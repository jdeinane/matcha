import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const Browsing = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [sortType, setSortType] = useState("score");

	useEffect(() => {
		fetchSuggestions();
	}, []);

	const getImageUrl = (path) => {
		if (!path) return "https://via.placeholder.com/300?text=No+Photo";
		if (path.startsWith("http")) return path;
		return `http://localhost:3000${path}`;
    };

	const fetchSuggestions = async () => {
		try {
			setLoading(true);
			const res = await axios.get("/api/browsing/suggestions");
			setUsers(res.data);
			setLoading(false);
		} catch (error) {
			toast.error("Error fetching suggestions");
			setLoading(false);
		}
	};

	const sortUsers = (list) => {
		const sorted = [...list];
		switch (sortType) {
			case "age":
				return sorted.sort((a, b) => a.age - b.age);
			case "distance":
				return sorted.sort((a, b) => a.distance - b.distance);
			case "fame":
				return sorted.sort((a, b) => b.fame_rating - a.fame_rating);
			case "tags":
				return sorted.sort((a, b) => b.commonTags - a.commonTags);
			default:
				return sorted.sort((a, b) => b.score - a.score);
		}
	};

	if (loading)
		return <div className="container center"><h2>Finding your match... 💖</h2></div>;

	return (
		<div className="container" style={{maxWidth: '1000px', margin: '0 auto', padding: '20px'}}>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
				<h1>Suggested People</h1>
				
				{/* BARRE DE TRI */}
				<div className="input-group" style={{width: '200px'}}>
					<label>Sort by:</label>
					<select value={sortType} onChange={(e) => setSortType(e.target.value)}>
						<option value="score">✨ Match Score</option>
						<option value="distance">📍 Distance</option>
						<option value="age">🎂 Age</option>
						<option value="fame">⭐ Popularity</option>
						<option value="tags">🏷️ Common Tags</option>
					</select>
				</div>
			</div>

			{users.length === 0 ? (
				<div className="card center">
					<h3>No one found nearby... 😢</h3>
					<p>Try changing your profile tags or location!</p>
				</div>
			) : (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
					{sortUsers(users).map(user => (
						<div key={user.id} className="card" style={{padding: '0', overflow: 'hidden', position: 'relative'}}>
							{/* Profile picture */}
							<div style={{height: '250px', background: '#eee'}}>
								<img 
									src={getImageUrl(user.profile_pic)}
									alt={user.username}
									style={{width: '100%', height: '100%', objectFit: 'cover'}}
								/>
							</div>
							
							{/* Infos */}
							<div style={{padding: '15px'}}>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
									<h3 style={{margin: 0}}>{user.first_name}, {user.age}</h3>
									<span style={{background: '#e0f7fa', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem'}}>
										{Math.round(user.distance)} km
									</span>
								</div>
								<p style={{color: '#666', fontSize: '0.9rem'}}>@{user.username}</p>
								
								<div style={{display: 'flex', gap: '10px', marginTop: '10px', fontSize: '0.8rem', color: '#555'}}>
									<span>⭐ {user.fame_rating} Fame</span>
									<span>🏷️ {user.commonTags} tags</span>
								</div>

								{/* Will work later (UserProfile page ou j'sais pas quoi) */}
								<Link to={`/user/${user.id}`} className="btn" style={{display: 'block', textAlign: 'center', marginTop: '15px'}}>
									View Profile
								</Link>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default Browsing;
