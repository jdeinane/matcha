import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const Login = () => {
	const { register, handleSubmit, formState: { errors } } = useForm();
	const navigate = useNavigate();
	const { login } = useAuth();
	const API_URL = import.meta.env.VITE_API_URL;

	const onSubmit = async (data) => {
		try {
			const response = await fetch(`${API_URL}/api/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
				credentials: "include"
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Login error");
			}

			login(result.user);

			toast.success("Successfully logged in!");
			navigate("/");

		} catch (error) {
			toast.error(error.message);
		}
	};

	return (
		<div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
			<div className="card" style={{ width: '100%', maxWidth: '400px' }}>
				<h1 className="center" style={{ marginBottom: '2rem' }}>🍵 Matcha</h1>
				<h2 className="center" style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Connexion</h2>
				
				<form onSubmit={handleSubmit(onSubmit)} className="flex-col">
					<div className="input-group">
						<label>Nom d'utilisateur</label>
						<input 
							{...register("username", { required: "Requis" })} 
							placeholder="Votre pseudo"
						/>
						{errors.username && <p className="error-msg">{errors.username.message}</p>}
					</div>

					<div className="input-group">
						<label>Mot de passe</label>
						<input 
							type="password"
							{...register("password", { required: "Requis" })} 
						/>
						{errors.password && <p className="error-msg">{errors.password.message}</p>}
					</div>

					<button type="submit" className="btn">Se connecter</button>
				</form>

				<p className="center" style={{ marginTop: '1.5rem' }}>
					Pas encore de compte ? <Link to="/register" className="link">S'inscrire</Link>
				</p>
			</div>
		</div>
	);
};

export default Login;
