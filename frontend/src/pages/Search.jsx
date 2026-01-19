import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const Search = () => {
	const [filters, setFilters] = useState({
		ageMin: 18,
		ageMax: 99,
		fameMin: 0,
		fameMax: 100,
		distanceMax: 100,
		tags: ""
	});
	const [results, setResults] = useState([]);
	const [searched, setSearched] = useState(false);

	const handleChange = (e) => {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	};

	const getImageUrl = (path) => {
		if (!path)
			return "https://via.placeholder.com/300?text=No+Photo";
		if (path.startsWith("http")) return path;
		return `http://localhost:3000${path}`;
	};

	const handleSearch = async (e) => {
		e.preventDefault();
		try {
			const params = {
				...filters,
				tags: filters.tags ? filters.tags.split(',').map(t => t.trim()) : []
			};

			const res = await axios.get("/api/browsing/search", { params });
			setResults(res.data);
			setSearched(true);
		} catch (error) {
			toast.error("Error during search");
			console.error(error);
		}
	};

	return (
		<div className="container" style={{ padding: '60px 20px' }}>
			
			<header style={{ marginBottom: '60px', textAlign: 'center' }}>
				<h1 style={{ fontSize: '4rem', marginBottom: '10px' }}>
					love is <span style={{ fontStyle: 'italic', color: 'var(--matcha)' }}>brewing..</span>
				</h1>
				<p style={{ 
					fontFamily: 'var(--font-accent)', 
					fontSize: '0.7rem', 
					textTransform: 'uppercase', 
					letterSpacing: '0.2em', 
					color: 'var(--text-muted)' 
				}}>
					Adjust your filters to find the perfect matcha
				</p>
			</header>
			
			<div className="card" style={{ 
				padding: '40px', 
				marginBottom: '80px', 
				background: 'var(--bg-card)',
				border: '1px solid var(--text-main)'
			}}>
				<form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
					
					<div className="input-group">
						<label>Prefered Age</label>
						<div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
							<input type="number" name="ageMin" min="18" value={filters.ageMin} onChange={handleChange} style={{ fontSize: '1.2rem', padding: '10px 0' }} />
							<span style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>à</span>
							<input type="number" name="ageMax" max="99" value={filters.ageMax} onChange={handleChange} style={{ fontSize: '1.2rem', padding: '10px 0' }} />
						</div>
					</div>

					<div className="input-group">
						<label>Popularity (Min)</label>
						<input type="number" name="fameMin" min="0" value={filters.fameMin} onChange={handleChange} placeholder="0" style={{ fontSize: '1.2rem' }} />
					</div>

					<div className="input-group">
						<label>Max Distance: {filters.distanceMax} km</label>
						<input type="range" name="distanceMax" min="1" max="500" value={filters.distanceMax} onChange={handleChange} style={{ cursor: 'pointer', marginTop: '15px' }} />
					</div>

					<div className="input-group">
						<label>Tags</label>
						<input type="text" name="tags" value={filters.tags} onChange={handleChange} placeholder="ex: art, travel, coffee" style={{ fontSize: '1.1rem' }} />
					</div>

					<button type="submit" className="btn" style={{ gridColumn: '1 / -1', marginTop: '20px', alignSelf: 'center' }}>
						Search
					</button>
				</form>
			</div>

			<div style={{ marginBottom: '40px' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--text-main)', paddingBottom: '10px', marginBottom: '30px' }}>
					<h2 style={{ fontSize: '1.8rem', margin: 0 }}>Results</h2>
					{searched && <span style={{ fontFamily: 'var(--font-accent)', fontSize: '0.6rem' }}>{results.length} PROFILES FOUND</span>}
				</div>

				{searched && results.length === 0 && (
					<p style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '1.5rem', marginTop: '50px' }}>
						Aucune correspondance trouvée dans nos archives.
					</p>
				)}
				
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
					gap: '30px' 
				}}>
					{results.map(user => (
						<Link key={user.id} to={`/user/${user.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
							<div className="card">
								<img 
									src={getImageUrl(user.profile_pic)}
									alt={user.first_name}
								/>
								<div style={{ textAlign: 'left', marginTop: '15px' }}>
									<h3 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{user.first_name}, {user.age}</h3>
									<p style={{ 
										fontFamily: 'var(--font-accent)', 
										fontSize: '0.6rem', 
										textTransform: 'uppercase', 
										letterSpacing: '0.1em',
										color: 'var(--text-muted)'
									}}>
										📍 {Math.round(user.distance)} km — ⭐ {user.fame_rating}
									</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
};

export default Search;
