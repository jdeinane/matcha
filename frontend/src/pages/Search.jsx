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
		<div className="container" style={{maxWidth: '1000px', margin: '0 auto', padding: '20px'}}>
			<h1>Advanced Search</h1>
			
			<div className="card" style={{padding: '20px', marginBottom: '30px'}}>
				<form onSubmit={handleSearch} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
					
					<div className="input-group">
						<label>Age: {filters.ageMin} - {filters.ageMax} years</label>
						<div style={{display: 'flex', gap: '10px'}}>
							<input type="number" name="ageMin" min="18" max="99" value={filters.ageMin} onChange={handleChange} placeholder="Min" />
							<input type="number" name="ageMax" min="18" max="99" value={filters.ageMax} onChange={handleChange} placeholder="Max" />
						</div>
					</div>

					<div className="input-group">
						<label>Popularity (Fame): {filters.fameMin} - {filters.fameMax}</label>
						<div style={{display: 'flex', gap: '10px'}}>
							<input type="number" name="fameMin" min="0" max="1000" value={filters.fameMin} onChange={handleChange} placeholder="Min" />
							<input type="number" name="fameMax" min="0" max="1000" value={filters.fameMax} onChange={handleChange} placeholder="Max" />
						</div>
					</div>

					<div className="input-group">
						<label>Max Distance (km): {filters.distanceMax}</label>
						<input type="range" name="distanceMax" min="0" max="1000" value={filters.distanceMax} onChange={handleChange} />
					</div>

					<div className="input-group">
						<label>Tags (comma separated)</label>
						<input type="text" name="tags" value={filters.tags} onChange={handleChange} placeholder="e.g: vegan, geek" />
					</div>

					<button type="submit" className="btn" style={{gridColumn: '1 / -1', marginTop: '10px'}}>
						Search
					</button>
				</form>
			</div>

			{/* RESULTS */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
				{searched && results.length === 0 && <p>No users found with these criteria.</p>}
				
				{results.map(user => (
					<div key={user.id} className="card" style={{padding: '0', overflow: 'hidden'}}>
						<div style={{height: '200px', background: '#eee'}}>
							<img 
								src={getImageUrl(user.profile_pic)}
								style={{width: '100%', height: '100%', objectFit: 'cover'}}
							/>
						</div>
						<div style={{padding: '15px'}}>
							<h3>{user.first_name}, {user.age}</h3>
							<p>@{user.username}</p>
							<div style={{fontSize: '0.8rem', color: '#666', marginBottom: '10px'}}>
								📍 {Math.round(user.distance)} km • ⭐ {user.fame_rating}
							</div>
							<Link to={`/user/${user.id}`} className="btn" style={{display: 'block', textAlign: 'center'}}>
								View Profile
							</Link>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default Search;
