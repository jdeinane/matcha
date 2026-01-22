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
				const data = res.data;
				
				if (data?.success === false || data?.error) {
					setTopProfiles([]);
					setLoading(false);
					return;
				}
				
				if (!Array.isArray(data)) {
					setTopProfiles([]);
					setLoading(false);
					return;
				}
				
				const shuffled = data.sort(() => 0.5 - Math.random());
				setTopProfiles(shuffled.slice(0, 5));
				setLoading(false);
			} catch (error) {
				console.error(error);
				setTopProfiles([]);
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

	return (
        <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
            
            <div style={{ marginBottom: '60px' }}>
                <h1 style={{ fontSize: '5rem', marginBottom: '10px' }}>
                    let's grab a coffee if we <br/> 
                    <span style={{ fontStyle: 'italic', color: 'var(--matcha)' }}>matcha.</span>
                </h1>
                <p style={{ 
                    fontFamily: 'var(--font-accent)', 
                    fontSize: '0.8rem', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.2em', 
                    color: 'var(--text-muted)' 
                }}>
                </p>
            </div>

            {loading ? (
                <p>Curating your selection...</p>
            ) : (
                <div style={{ marginBottom: '80px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '30px', borderBottom: '1px solid var(--text-main)', paddingBottom: '10px' }}>
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>Selection of the Day</h2>
                        <span style={{ fontFamily: 'var(--font-accent)', fontSize: '0.6rem' }}>VOL. {new Date().getDate()}</span>
                    </div>
                    
                    {topProfiles.length > 0 ? (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '20px' 
                        }}> 
                            {topProfiles.map(user => (
                                <Link key={user.id} to={`/user/${user.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
                                    <div className="card">
                                        <img 
                                            src={getImageUrl(user.profile_pic)}
                                            alt={user.first_name}
                                        />
                                        <div style={{ textAlign: 'left' }}>
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{user.first_name}</h3>
                                            <p>
                                                {user.age} — {Math.round(user.distance)} KM
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

            <div style={{ marginTop: '50px' }}>
                <p style={{ marginBottom: '30px', fontSize: '1.2rem', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
                    Not inspired?
                </p>
                <Link to="/browse" className="btn">
                    Explore the Archive
                </Link>
            </div>

        </div>
    );
};

export default Home;
