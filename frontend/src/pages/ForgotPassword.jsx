import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		try {
			const res = await axios.post("/api/auth/forgot-password", { email });
			toast.success(res.data.message);
		} catch (error) {
			toast.error(error.response?.data?.error || "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
			<div className="card" style={{ width: '100%', maxWidth: '400px' }}>
				<h1 className="center" style={{ marginBottom: '2rem', color: 'var(--matcha)' }}>Matcha</h1>
				<h2 className="center" style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Reset Password</h2>
				<p className="center" style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', marginBottom: '2rem', color: 'var(--text-muted)' }}>
					Enter your email address and we'll send you a link to reset your password.
				</p>
				
				<form onSubmit={handleSubmit} className="flex-col">
					<div className="input-group">
						<label>Email Address</label>
						<input 
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="your@email.com"
							required
						/>
					</div>
					<button type="submit" className="btn" disabled={loading}>
						{loading ? "Sending..." : "Send Reset Link"}
					</button>
				</form>

				<p className="center" style={{ marginTop: '1.5rem' }}>
					<Link to="/login" className="link" style={{ fontSize: '0.8rem', textDecoration: 'none', textTransform: 'uppercase', fontFamily: 'var(--font-accent)' }}>
						Back to Login
					</Link>
				</p>
			</div>
		</div>
	);
};

export default ForgotPassword;
