import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const VerifyEmail = () => {
	const { token } = useParams();
	const navigate = useNavigate();
	const hasFetched = useRef(false); // Pour éviter le double appel en React StrictMode

	useEffect(() => {
		if (hasFetched.current) return;
		hasFetched.current = true;

		const verifyAccount = async () => {
			try {
				// On envoie le token au backend pour valider le compte
				await axios.post("/api/auth/verify-email", { token });
				toast.success("Account successfully verified! You can now log in.");
				navigate("/login");
			} catch (error) {
				toast.error(error.response?.data?.error || "Invalid or expired token.");
				navigate("/register");
			}
		};

		if (token) {
			verifyAccount();
		}
	}, [token, navigate]);

	return (
		<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
			<h2>Verifying your account...</h2>
			<p>Please wait a moment.</p>
		</div>
	);
};

export default VerifyEmail;
