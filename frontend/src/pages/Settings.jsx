import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const Profile = () => {
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [manualCity, setManualCity] = useState("");
	const [history, setHistory] = useState({ visits: [], likes: [] });

	// Etats pour les formulaires
	const [formData, setFormData] = useState({
		first_name: "", last_name: "", email: "",
		gender: "male", sexual_preference: "bisexual", biography: "", tags: "",
		birthdate: ""
	});
	const [file, setFile] = useState(null);

	// Charger les donnees au montage
	useEffect(() => {
		fetchProfile();
	}, []);

	const fetchProfile = async () => {
		try {
			const res = await axios.get("/api/users/profile");
			setProfile(res.data);

			const [resVisits, resLikes] = await Promise.all([
				axios.get("/api/users/visits"),
				axios.get("/api/users/likes")
			]);
			setHistory({ visits: resVisits.data, likes: resLikes.data });
			setLoading(false);

			// Pre-remplir les formulaires
			setFormData({
				first_name: res.data.first_name,
				last_name: res.data.last_name,
				email: res.data.email,
				gender: res.data.gender || "male",
				sexual_preference: res.data.sexual_preference || "bisexual",
				biography: res.data.biography || "",
				tags: res.data.tags ? res.data.tags.join(", ") : "",
				birthdate: res.data.birthdate ? res.data.birthdate.split('T')[0] : "" // Format YYYY-MM-DD
			});
			setLoading(false);

		} catch (error) {
			toast.error("Error fetching profile");
			setLoading(false);
		}
	};

	/* UPDATE ACCOUNT */
	const updateAccount = async (e) => {
		e.preventDefault();
		try {
			await axios.put("/api/users/account", {
				first_name: formData.first_name,
				last_name: formData.last_name,
				email: formData.email
			});
			toast.success("Account info updated!");
			fetchProfile();

		} catch (error) {
			toast.error(error.response?.data?.error || "Error updating account");
		}
	};

	/* UPDATE PROFILE */
	const updateProfile = async (e) => {
		e.preventDefault();
		try {
			const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t.length > 0);

			await axios.put("/api/users/profile", {
				gender: formData.gender,
				sexual_preference: formData.sexual_preference,
				biography: formData.biography,
				tags: tagsArray,
				birthdate: formData.birthdate
			});
			toast.success("Profile details updated!");
			fetchProfile();

		} catch (error) {
			toast.error(error.response?.data?.error || "Error updating profile");
		}
	};

	/* PHOTOS HANDLER */
	const handleUpload = async () => {
		if (!file)
			return toast.error("Please select a file");

		const formDataImg = new FormData();
		formDataImg.append("image", file);

		try {
			await axios.post("/api/users/photos", formDataImg, {
				headers: { "Content-Type": "multipart/form-data" }
			});
			toast.success("Photo uploaded!");
			setFile(null);
			fetchProfile();

		} catch (error) {
			toast.error(error.response?.data?.error || "Upload failed");
		}
	};

	const handleDeletePhoto = async (id) => {
		try {
			await axios.delete(`/api/users/photos/${id}`);
			toast.success("Photo deleted");
			fetchProfile();

		} catch (error) {
			toast.error("Error deleting photo");
		}
	};

	const handleSetProfilePic = async (id) => {
		try {
			await axios.put(`/api/users/photos/${id}/profile`);
			toast.success("Profile picture updated");
			fetchProfile();

		} catch (error) {
			toast.error("Error updating profile picture");
		}
	};

	/* MANUALLY SET LOCATION */
	const handleManualLocation = async (e) => {
		e.preventDefault();
		if (!manualCity) return;

		try {
			// Utilisation de l'API OpenStreetMap
			const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?city=${manualCity}&format=json&addressdetails=1`);
			
			if (geoRes.data && geoRes.data.length > 0) {
				const data = geoRes.data[0];
				const { lat, lon } = data;
				
				const address = data.address || {};
				const normalizedCity = address.city || address.town || address.village || address.municipality || manualCity;

				await axios.put("/api/users/location", {
					latitude: parseFloat(lat),
					longitude: parseFloat(lon),
					city: normalizedCity
				});
				setManualCity(normalizedCity);
				toast.success(`Location updated : ${manualCity}`);
				fetchProfile();
			} else {
				toast.error("City not found");
			}
		} catch (error) {
			console.error(error);
			toast.error("Error while setting location manually");
		}
	};

	/* GEOLOCATION */
	const handleLocateMe = () => {
		if (!navigator.geolocation)
			return toast.error("Geolocation is not supported by your browser");

		const options = {
			enableHighAccuracy: true,
			timeout: 10000,
			maximumAge: 0
		};

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				try {
					await axios.put("/api/users/location", {
						latitude: position.coords.latitude,
						longitude: position.coords.longitude
					});
					toast.success("Location updated!");
					fetchProfile();
				} catch (error) {
					console.error("Backend error:", error);
					toast.error("Error saving location");
				}
			},
			(error) => {
				console.warn("Geolocation error object:", error);
				let msg = "Unable to retrieve location";

				switch(error.code) {
					case error.PERMISSION_DENIED:
						msg = "User denied the request for Geolocation.";
						break;
					case error.TIMEOUT:
						msg = "The request to get user location timed out.";
						break;
					default:
						msg = "An unknown error occurred.";
						break;
				}
				toast.error(msg);
			},
			options
		);
	};

	const UserList = ({ users, emptyMsg }) => {
	if (!users || users.length === 0)
		return <p style={{color: '#888', fontStyle: 'italic'}}>{emptyMsg}</p>;

	return (
            <div style={{display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px'}}>
                {users.map((u, i) => (
                    <Link key={i} to={`/user/${u.id}`} style={{textDecoration: 'none', color: 'inherit', minWidth: '80px', textAlign: 'center'}}>
                        <img 
                            src={u.profile_pic ? `http://localhost:3000${u.profile_pic}` : "https://via.placeholder.com/50"} 
                            style={{width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd'}}
                        />
                        <div style={{fontSize: '0.8rem', fontWeight: 'bold', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {u.username}
                        </div>
                        {u.created_at && (
                            <div style={{fontSize: '0.7rem', color: '#999'}}>
                                {new Date(u.created_at).toLocaleDateString()}
                            </div>
                        )}
                    </Link>
                ))}
            </div>
        );
	};

	if (loading)
		return <div>Loading profile...</div>;

	return (
		<div className="container" style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
			<h1>My Profile</h1>
			<p>Popularity Score (Fame): <strong>{profile.fame_rating}</strong></p>

			{/* SECTION 1: PHOTOS */}
			<div className="card" style={{marginBottom: '20px', padding: '20px', border: '1px solid #ddd'}}>
				<h2>Photos ({profile.images?.length}/5)</h2>
				<div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px'}}>
					{profile.images?.map(img => (
						<div key={img.id} style={{position: 'relative', width: '100px', height: '100px'}}>
							<img 
								src={`http://localhost:3000${img.file_path}`} 
								alt="user" 
								style={{
									width: '100%', height: '100%', objectFit: 'cover', 
									border: img.is_profile_pic ? '3px solid #4CAF50' : '1px solid #ccc'
								}}
							/>
							<button onClick={() => handleDeletePhoto(img.id)} style={{position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none'}}>X</button>
							{!img.is_profile_pic && (
								<button onClick={() => handleSetProfilePic(img.id)} style={{position: 'absolute', bottom: 0, width: '100%', fontSize: '0.7rem'}}>Main</button>
							)}
						</div>
					))}
				</div>
				{profile.images?.length < 5 && (
					<div style={{display: 'flex', gap: '10px'}}>
						<input type="file" onChange={e => setFile(e.target.files[0])} />
						<button onClick={handleUpload} className="btn">Upload</button>
					</div>
				)}
			</div>

			{/* SECTION 2: GEOLOCALISATION */}
			<div className="card" style={{marginBottom: '20px', padding: '20px', border: '1px solid #ddd'}}>
				<h2>Location</h2>
				<p>
					Latitude: {profile.latitude || "Not set"} <br/>
					Longitude: {profile.longitude || "Not set"}
				</p>
				<button onClick={handleLocateMe} className="btn" style={{backgroundColor: '#2196F3'}}>
					📍 Locate Me (GPS)
				</button>
			</div>

			<form onSubmit={handleManualLocation} style={{marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px'}}>
				<label style={{display: 'block', marginBottom: '5px'}}>Or set manually (City):</label>
				<div style={{display: 'flex', gap: '10px'}}>
					<input 
						type="text" 
						value={manualCity} 
						onChange={(e) => setManualCity(e.target.value)} 
						placeholder="Paris, London..." 
						style={{flex: 1}}
					/>
					<button type="submit" className="btn">Set City</button>
				</div>
			</form>

			{/* SECTION 3: INFORMATIONS PUBLIQUES */}
			<div className="card" style={{marginBottom: '20px', padding: '20px', border: '1px solid #ddd'}}>
				<h2>Public Details</h2>
				<form onSubmit={updateProfile} className="flex-col">
					<div className="input-group">
						<label>Gender</label>
						<select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
							<option value="male">Male</option>
							<option value="female">Female</option>
							<option value="other">Other</option>
						</select>
					</div>
					<div className="input-group">
						<label>Sexual Preference</label>
						<select value={formData.sexual_preference} onChange={e => setFormData({...formData, sexual_preference: e.target.value})}>
							<option value="heterosexual">Heterosexual</option>
							<option value="gay">Gay</option>
							<option value="bisexual">Bisexual</option>
						</select>
					</div>
					<div className="input-group">
						<label>Biography</label>
						<textarea 
							value={formData.biography} 
							onChange={e => setFormData({...formData, biography: e.target.value})}
							rows="3"
						/>
					</div>
					<div className="input-group">
						<label>Tags (comma separated)</label>
						<input 
							type="text" 
							value={formData.tags} 
							onChange={e => setFormData({...formData, tags: e.target.value})} 
							placeholder="vegan, geek, gym..."
						/>
					</div>
					<div className="input-group">
						<label>Birth Date</label>
						<input 
							type="date" 
							value={formData.birthdate} 
							onChange={e => setFormData({...formData, birthdate: e.target.value})} 
						/>
					</div>
					<button type="submit" className="btn">Update Public Profile</button>
				</form>
			</div>

			{/* SECTION 4: COMPTE SECURISE */}
			<div className="card" style={{marginBottom: '20px', padding: '20px', border: '1px solid #ddd'}}>
				<h2>🔒 Account Settings</h2>
				<form onSubmit={updateAccount} className="flex-col">
					<div className="input-group">
						<label>First Name</label>
						<input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
					</div>
					<div className="input-group">
						<label>Last Name</label>
						<input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
					</div>
					<div className="input-group">
						<label>Email</label>
						<input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
					</div>
					<button type="submit" className="btn" style={{backgroundColor: '#FF9800'}}>Update Account</button>
				</form>
			</div>

			{/* SECTION 5: HISTORIQUE */}
			<div className="card" style={{marginTop: '20px', padding: '20px', border: '1px solid #ddd'}}>
                <h2>History</h2>
                
                <div style={{marginBottom: '20px'}}>
                    <h3 style={{fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>
                        People who liked you
                    </h3>
                    <UserList users={history.likes} emptyMsg="No likes yet. Keep updating your profile!" />
                </div>

                <div>
                    <h3 style={{fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>
                        👀 Recent Guests
                    </h3>
                    <UserList users={history.visits} emptyMsg="No visitors yet." />
                </div>
            </div>
		</div>
	);
};

export default Profile;
