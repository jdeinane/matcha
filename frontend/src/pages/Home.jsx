import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Home = () => {
	const [topProfiles, setTopProfiles] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchTopPicks = async () => {
			try {
				const res = await axios.get("/api/browsing/suggestions");
				setTopProfiles(res.data.slice(0, 5));
				setLoading(false);
			} catch (error) {
				console.error(error);
				setLoading(false);
			}
		};
		fetchTopPicks();
	}, []);

	const getImageUrl = (path) => {
        if (!path) return "https://via.placeholder.com/300?text=No+Photo";
        if (path.startsWith("http")) return path;
        return `http://localhost:3000${path}`;
    };

	const carouselStyle = {
		display: 'flex',
		gap: '20px',
		overflowX: 'auto',
		padding: '20px 0',
		scrollSnapType: 'x mandatory',
		scrollbarWidth: 'none'
	};

	return (
		<div className="container" style={{maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', textAlign: 'center'}}>
			
			<div style={{marginBottom: '50px'}}>
				<p style={{fontSize: '1.2rem', color: '#555'}}>
					Find your perfect match based on interests, location and popularity.
				</p>
			</div>

			{loading ? (
				<p>Finding the best matches for you...</p>
			) : (
				<div style={{textAlign: 'left'}}>
					<h2 style={{marginLeft: '10px'}}>🔥 Top Picks for You</h2>
					
					{topProfiles.length > 0 ? (
						<div style={carouselStyle} className="hide-scrollbar">
							{topProfiles.map(user => (
								<Link key={user.id} to={`/user/${user.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
									<div className="card" style={{
										minWidth: '220px', 
										scrollSnapAlign: 'start', 
										cursor: 'pointer',
										transition: 'transform 0.2s',
										padding: 0,
										overflow: 'hidden'
									}}>
										<div style={{height: '220px', background: '#eee'}}>
											<img 
												src={getImageUrl(user.profile_pic)}
												style={{width: '100%', height: '100%', objectFit: 'cover'}}
											/>
										</div>
										<div style={{padding: '15px'}}>
											<h3 style={{fontSize: '1.1rem', margin: '0 0 5px 0'}}>{user.first_name}, {user.age}</h3>
											<p style={{fontSize: '0.9rem', color: '#666', margin: 0}}>
												⭐ {user.fame_rating} • 📍 {Math.round(user.distance)}km
											</p>
										</div>
									</div>
								</Link>
							))}
						</div>
					) : (
						<p>No suggestions yet. Try updating your profile tags!</p>
					)}
				</div>
			)}

			<div style={{marginTop: '50px'}}>
				<p style={{marginBottom: '20px', fontSize: '1.1rem'}}>Not your taste?</p>
				<Link to="/browse" className="btn" style={{
					padding: '15px 40px', 
					fontSize: '1.2rem', 
					borderRadius: '30px',
					background: 'linear-gradient(45deg, #FF4081, #E91E63)'
				}}>
					🌍 Start Browsing
				</Link>
			</div>

		</div>
	);
};

export default Home;
