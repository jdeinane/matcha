import { useState } from "react";
import { useParams, useNavigate, data } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const ResetPassword = () => {
	const { token } = useParams(); // Récupère le token dans l'URL
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			return toast.error("Passwords do not match");
		}

		try {
			const res = await axios.post("/api/auth/reset-password", { token, newPassword: password });
			
			if (res.data.success === false) {
				toast.error(res.data.error);
				return;
			}
			
			toast.success("Password reset successful! You can now login.");
			navigate("/login");
		} catch (error) {
			toast.error(error.response?.data?.error || "Invalid or expired token");
		}
	};

	return (
		<div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
			<div className="card" style={{ width: '100%', maxWidth: '400px' }}>
				<h1 className="center" style={{ marginBottom: '2rem', color: 'var(--matcha)' }}>Matcha</h1>
				<h2 className="center" style={{ marginBottom: '1.5rem' }}>New Password</h2>
				
				<form onSubmit={handleSubmit} className="flex-col">
					<div className="input-group">
						<label>New Password</label>
						<input 
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					<div className="input-group">
						<label>Confirm New Password</label>
						<input 
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
						/>
					</div>
					<button type="submit" className="btn">Update Password</button>
				</form>
			</div>
		</div>
	);
};

export default ResetPassword;
