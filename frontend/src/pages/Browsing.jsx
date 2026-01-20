import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const Browsing = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [sortType, setSortType] = useState("score");
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState({
		ageMin: 18,
		ageMax: 99,
		fameMin: 0,
		distanceMax: 500,
		tags: ""
	});

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

	const filterUsers = (list) => {
			return list.filter(user => {
				if (user.age < filters.ageMin || user.age > filters.ageMax) return false;
				if (user.fame_rating < filters.fameMin) return false;
				if (user.distance > filters.distanceMax) return false;
				if (user.commonTags < filters.minCommonTags) return false;
				return true;
			});
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

	const handleFilterChange = (e) => {
			setFilters({ ...filters, [e.target.name]: Number(e.target.value) });
		};

	if (loading)
		return <div className="container center"><h2>Finding your match... </h2></div>;

	const filteredAndSortedUsers = sortUsers(filterUsers(users));

    return (
        <div className="container" style={{ padding: '60px 20px' }}>
            
            {/* --- HEADER --- */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end', 
                marginBottom: '40px',
                borderBottom: '1px solid var(--text-main)',
                paddingBottom: '20px'
            }}>
                <div>
                    <h1 style={{ fontSize: '3.5rem', marginBottom: '5px' }}>
                        Discover <span style={{ fontStyle: 'italic', color: 'var(--matcha)' }}>Souls.</span>
                    </h1>
                    <p style={{ 
                        fontFamily: 'var(--font-accent)', 
                        fontSize: '0.7rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.2em', 
                        color: 'var(--text-muted)' 
                    }}>
                        Recommended for you based on your essence.
                    </p>
                </div>

                {/* --- CONTROLS (Sort + Filter Toggle) --- */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                    
                    {/* Bouton pour afficher/masquer les filtres */}
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className="btn" 
                        style={{ 
                            padding: '10px 20px', 
                            fontSize: '0.8rem', 
                            height: 'fit-content',
                            marginBottom: '0',
                            backgroundColor: showFilters ? 'var(--matcha)' : 'transparent',
                            color: showFilters ? 'white' : 'var(--text-main)',
                            border: '1px solid var(--text-main)'
                        }}
                    >
                        {showFilters ? "Close Filters" : "Filter Results"}
                    </button>

                    <div className="input-group" style={{ width: '150px', marginBottom: 0 }}>
                        <label style={{ fontSize: '0.6rem' }}>Sort by</label>
                        <select 
                            value={sortType} 
                            onChange={(e) => setSortType(e.target.value)}
                            style={{ fontSize: '0.9rem', padding: '5px 0' }}
                        >
                            <option value="score">Match Score</option>
                            <option value="distance">Distance</option>
                            <option value="age">Age</option>
                            <option value="fame">Popularity</option>
                            <option value="tags">Common Tags</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* --- FILTER PANEL (Affiché conditionnellement hors de la grille) --- */}
            {showFilters && (
                <div className="card" style={{ 
                    marginBottom: '40px', 
                    padding: '30px', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '30px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--text-main)'
                }}>
                    <div className="input-group">
                        <label>Age Range ({filters.ageMin} - {filters.ageMax})</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="number" name="ageMin" min="18" value={filters.ageMin} onChange={handleFilterChange} placeholder="Min" />
                            <input type="number" name="ageMax" max="99" value={filters.ageMax} onChange={handleFilterChange} placeholder="Max" />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Min Popularity ({filters.fameMin})</label>
                        <input type="number" name="fameMin" min="0" value={filters.fameMin} onChange={handleFilterChange} />
                    </div>

                    <div className="input-group">
                        <label>Max Distance ({filters.distanceMax} km)</label>
                        <input type="range" name="distanceMax" min="5" max="1000" value={filters.distanceMax} onChange={handleFilterChange} />
                    </div>

                    <div className="input-group">
                        <label>Min Common Tags ({filters.minCommonTags})</label>
                        <input type="number" name="minCommonTags" min="0" value={filters.minCommonTags} onChange={handleFilterChange} />
                    </div>
                </div>
            )}

            {/* --- RESULTS GRID --- */}
            {filteredAndSortedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '2rem' }}>
                        The archive is empty...
                    </h3>
                    <p style={{ color: 'var(--text-muted)' }}>Try broadening your horizons or updating your profile.</p>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                    gap: '40px' 
                }}>
                    {filteredAndSortedUsers.map(user => (
                        <Link 
                            key={user.id} 
                            to={`/user/${user.id}`} 
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div className="card">
                                <div style={{ overflow: 'hidden', borderRadius: 'var(--radius)' }}>
                                    <img 
                                        src={getImageUrl(user.profile_pic)}
                                        alt={user.username}
                                        style={{ 
                                            width: '100%', 
                                            aspectRatio: '3/4', 
                                            objectFit: 'cover',
                                            display: 'block' 
                                        }}
                                    />
                                </div>
                                
                                <div style={{ paddingTop: '15px', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{user.first_name}</h3>
                                        <span style={{ 
                                            fontFamily: 'var(--font-accent)', 
                                            fontSize: '0.6rem', 
                                            color: 'var(--text-muted)' 
                                        }}>
                                            {user.age}
                                        </span>
                                    </div>
                                    
                                    <p style={{ 
                                        fontFamily: 'var(--font-accent)', 
                                        fontSize: '0.6rem', 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.1em',
                                        color: 'var(--text-muted)',
                                        marginTop: '8px'
                                    }}>
                                        📍 {Math.round(user.distance)} km away
                                    </p>
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '15px', 
                                        marginTop: '10px', 
                                        fontSize: '0.6rem', 
                                        color: 'var(--text-main)',
                                        fontFamily: 'var(--font-body)'
                                    }}>
                                        <span>⭐ {user.fame_rating} Fame</span>
                                        <span>🏷️ {user.commonTags} tags</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Browsing;
