import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [manualCity, setManualCity] = useState("");
	const [history, setHistory] = useState({ visits: [], likes: [] });
	const [blockedUsers, setBlockedUsers] = useState([]);
	const { logout } = useAuth();

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
		fetchBlockedUsers();
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

	const fetchBlockedUsers = async () => {
		try {
			const res = await axios.get("/api/interactions/blocks");
			setBlockedUsers(res.data);
		} catch (err) {
			console.error("Failed to fetch blocked users");
		}
	};

	const handleUnblock = async (targetId) => {
		try {
			await axios.post("/api/interactions/unblock", { target_id: targetId });
			toast.success("User unblocked");
			setBlockedUsers(prev => prev.filter(u => u.id !== targetId));
		} catch (err) {
			toast.error("Failed to unblock");
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
					const { latitude, longitude } = position.coords;
					let detectedCity = "";

					try {
						const geoRes = await axios.get(
							`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
						);
						if (geoRes.data && geoRes.data.address) {
							const address = geoRes.data.address;
							detectedCity = address.city || address.town || address.village || address.municipality || "";
						}
					} catch (geoError) {
						console.warn("Could not retrieve city name from coordinates", geoError);
					}

					await axios.put("/api/users/location", {
						latitude,
						longitude,
						city: detectedCity
					});

					toast.success(detectedCity ? `Location updated: ${detectedCity}` : "Location updated!");
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

	/* DELETE ACCOUNT */
	const handleDeleteAccount = async () => {
		const confirm = window.confirm(
			"ARE YOU SURE? This action is irreversible. All your matches and photos will be lost forever."
		);
		
		if (confirm) {
			try {
				await axios.delete("/api/users/account");
				toast.success("Account deleted. Farewell.");
				logout();
			} catch (error) {
				toast.error("Failed to delete account");
			}
		}
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
		<div className="container" style={{ padding: '60px 20px' }}>
			<header style={{ marginBottom: '80px', textAlign: 'center' }}>
				<h1 style={{ fontSize: '4rem' }}>My <span style={{ fontStyle: 'italic', color: 'var(--matcha)' }}>Curated</span> Space.</h1>
				<p style={{ fontFamily: 'var(--font-accent)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
					Popularity Index: {profile?.fame_rating} points
				</p>
			</header>

			{profile?.images?.length === 0 && (
				<div style={{ 
					background: 'var(--accent)', 
					padding: '20px', 
					marginBottom: '40px', 
					borderRadius: 'var(--radius)',
					border: '1px solid var(--matcha)',
					fontSize: '0.8rem',
					fontFamily: 'var(--font-accent)',
					textTransform: 'uppercase',
					textAlign: 'center',
					letterSpacing: '0.1em'
				}}>
					✨ Your profile is invisible to others until you upload at least one photo.
				</div>
			)}

			{/* SECTION 1: PHOTOS */}
			<section className="settings-section">
				<h2>Visual Identity ({profile?.images?.length}/5)</h2>
				
				{profile?.images?.length === 0 ? (
					<div 
						onClick={() => document.getElementById('file-upload').click()}
						style={{
							width: '100%',
							maxWidth: '300px',
							aspectRatio: '3/4',
							border: '2px dashed var(--text-main)',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							backgroundColor: 'rgba(106, 138, 79, 0.05)',
							borderRadius: 'var(--radius)',
							transition: 'all 0.3s ease',
							margin: '0 auto 30px auto'
						}}
					>
						<span style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📸</span>
						<p style={{ fontFamily: 'var(--font-accent)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
							Upload your first memory
						</p>
					</div>
				) : (
					<div className="photo-manager-grid">
						{profile?.images?.map(img => (
							<div key={img.id} className="photo-slot" style={{ border: img.is_profile_pic ? '2px solid var(--matcha)' : '1px solid var(--text-main)' }}>
								<img src={`http://localhost:3000${img.file_path}`} alt="user" />
								<div className="photo-actions">
									<button className="photo-btn delete" onClick={() => handleDeletePhoto(img.id)}>Remove</button>
									{!img.is_profile_pic && (
										<button className="photo-btn" onClick={() => handleSetProfilePic(img.id)}>Main</button>
									)}
								</div>
							</div>
						))}
					</div>
				)}
				
				{profile?.images?.length < 5 && (
					<div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '20px', justifyContent: 'center' }}>
						<input type="file" id="file-upload" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
						<label htmlFor="file-upload" className="btn" style={{ background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}>
							{file ? file.name : "Select Image"}
						</label>
						<button onClick={handleUpload} className="btn">Upload</button>
					</div>
				)}
			</section>

			{/* SECTION 2: BIOGRAPHY & DETAILS */}
			<section className="settings-section">
				<h2>The Narrative</h2>
				<form onSubmit={updateProfile}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
						<div className="input-group">
							<label>Gender Identity</label>
							<select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="other">Other</option>
							</select>
						</div>
						<div className="input-group">
							<label>Orientation</label>
							<select value={formData.sexual_preference} onChange={e => setFormData({...formData, sexual_preference: e.target.value})}>
								<option value="heterosexual">Heterosexual</option>
								<option value="gay">Gay</option>
								<option value="bisexual">Bisexual</option>
							</select>
						</div>
					</div>

					<div className="input-group" style={{ marginTop: '30px' }}>
						<label>Your Story (Biography)</label>
						<textarea 
							value={formData.biography} 
							onChange={e => setFormData({...formData, biography: e.target.value})}
							rows="4"
							placeholder="Tell your story..."
						/>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', marginTop: '30px' }}>
						<div className="input-group">
							<label>Interests (tags, comma separated)</label>
							<input 
								type="text" 
								value={formData.tags} 
								onChange={e => setFormData({...formData, tags: e.target.value})} 
								placeholder="vegan, art, coffee..."
							/>
						</div>
						<div className="input-group">
							<label>Birth Date (Verified)</label>
							<input 
								type="date" 
								value={formData.birthdate} 
								readOnly 
								disabled
								style={{ opacity: 0.5, cursor: 'not-allowed' }}
							/>
							<p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '5px' }}>
								Age cannot be changed after registration.
							</p>
						</div>
					</div>
					<button type="submit" className="btn" style={{ marginTop: '40px' }}>Save Narrative</button>
				</form>
			</section>

			{/* SECTION 3: LOCATION */}
			<section className="settings-section">
				<h2>Presence & Location</h2>
				<p style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--font-accent)', textTransform: 'uppercase' }}>
					Current Base: {profile?.city || "Unknown City"} 
					<span style={{ marginLeft: '10px', opacity: 0.5 }}>({profile?.latitude?.toFixed(2)}, {profile?.longitude?.toFixed(2)})</span>
				</p>
				<div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
					<button onClick={handleLocateMe} className="btn" style={{ background: 'var(--matcha)', border: 'none' }}>Locate Me (GPS)</button>
					<form onSubmit={handleManualLocation} style={{ flex: 1, display: 'flex', gap: '10px' }}>
						<input 
							type="text" 
							value={manualCity} 
							onChange={(e) => setManualCity(e.target.value)} 
							placeholder="Or enter city manually..." 
							style={{ flex: 1 }}
						/>
						<button type="submit" className="btn" style={{ background: 'transparent', color: 'var(--text-main)' }}>Update</button>
					</form>
				</div>
			</section>

			{/* SECTION 4: ACCOUNT */}
			<section className="settings-section">
				<h2>Account Credentials</h2>
				<form onSubmit={updateAccount}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
						<div className="input-group">
							<label>First Name</label>
							<input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
						</div>
						<div className="input-group">
							<label>Last Name</label>
							<input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
						</div>
					</div>
					<div className="input-group" style={{ marginTop: '30px' }}>
						<label>Email Address</label>
						<input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
					</div>
					<button type="submit" className="btn" style={{ marginTop: '40px', background: 'var(--text-main)', color: 'var(--bg-body)' }}>Update Account</button>
				</form>
			</section>

			{/* SECTION 5: HISTORY */}
			<section className="settings-section" >
				<h2>History & Connections</h2>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px' }}>
					<div>
						<h3 style={{ fontFamily: 'var(--font-accent)', fontSize: '0.6rem', marginBottom: '30px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recent Guests</h3>
						<UserList users={history.visits} emptyMsg="No visitors yet." />
					</div>
					<div>
						<h3 style={{ fontFamily: 'var(--font-accent)', fontSize: '0.6rem', marginBottom: '30px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Admirers (Likes)</h3>
						<UserList users={history.likes} emptyMsg="No likes yet." />
					</div>
				</div>
			</section>

			<div className="settings-section" style={{ marginTop: '60px' }}>
				<h2>Blocked Profiles</h2>
				{blockedUsers.length === 0 ? (
					<p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No blocked users.</p>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
						{blockedUsers.map(u => (
							<div key={u.id} style={{ 
								display: 'flex', 
								alignItems: 'center', 
								justifyContent: 'space-between',
								padding: '15px',
								border: '1px solid rgba(0,0,0,0.1)',
								borderRadius: 'var(--radius)'
							}}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
									<img 
										src={u.profile_pic ? `http://localhost:3000${u.profile_pic}` : "https://via.placeholder.com/40"} 
										alt={u.first_name}
										style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
									/>
									<span style={{ fontFamily: 'var(--font-accent)', fontSize: '0.8rem' }}>
										{u.first_name} (@{u.username})
									</span>
								</div>
								<button 
									onClick={() => handleUnblock(u.id)}
									className="btn"
									style={{ 
										padding: '8px 15px', 
										fontSize: '0.6rem', 
										backgroundColor: 'transparent', 
										color: 'var(--text-main)',
										borderColor: 'var(--text-main)'
									}}
								>
									Unblock
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* SECTION 6: DANGER ZONE */}
			<section className="settings-section" style={{ borderTop: '1px solid #ff4444', marginTop: '50px' }}>
				<h2 style={{ color: '#ff4444' }}>Danger Zone</h2>
				<p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
					Once you delete your account, there is no going back. Please be certain.
				</p>
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}>
					<button 
						onClick={logout} 
						className="btn btn-logout"
						style={{ width: '100%', maxWidth: '280px' }}
					>
						Logout from Matcha
					</button>
					<button 
						onClick={handleDeleteAccount} 
						className="btn" 
						style={{ 
							background: '#ff4444', 
							color: 'white', 
							border: 'none',
							width: '100%',
							maxWidth: '280px'
						}}
					>
						Delete My Account
					</button>
				</div>
			</section>
		</div>
	);
};

export default Profile;
