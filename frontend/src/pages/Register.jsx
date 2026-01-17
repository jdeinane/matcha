import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Register = () => {
	const { register, handleSubmit, formState: { errors} } = useForm();
	const navigate = useNavigate();
	const API_URL = import.meta.env.VITE_API_URL;

	const onSubmit = async (data) => {
		try {
			const response = await fetch(`${API_URL}/api/auth/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "An error has occurred");
			}

			toast.success("Successfully registered! Please check your mail box.");
			navigate("/login");

		} catch (error) {
			toast.error(error.message);
		}
	};

	return (
		<div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
			<div className="card" style={{ width: '100%', maxWidth: '400px' }}>
				<h1 className="center" style={{ marginBottom: '2rem' }}>🍵 Matcha</h1>
				<h2 className="center" style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Create account</h2>
				
				<form onSubmit={handleSubmit(onSubmit)} className="flex-col">
					
					<div className="input-group">
						<label>Nom d'utilisateur</label>
						<input 
							{...register("username", { required: "This field is required", minLength: { value: 3, message: "Min 3 characters" } })} 
							placeholder="Ex: matcha_lover"
						/>
						{errors.username && <p className="error-msg">{errors.username.message}</p>}
					</div>

					<div className="input-group">
						<label>Email</label>
						<input 
							type="email"
							{...register("email", { required: "Email required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email" } })} 
							placeholder="Ex: love@matcha.com"
						/>
						{errors.email && <p className="error-msg">{errors.email.message}</p>}
					</div>

					<div style={{ display: 'flex', gap: '10px' }}>
						<div className="input-group" style={{ flex: 1 }}>
							<label>Prénom</label>
							<input {...register("first_name", { required: "Required" })} />
							{errors.first_name && <p className="error-msg">{errors.first_name.message}</p>}
						</div>
						<div className="input-group" style={{ flex: 1 }}>
							<label>Nom</label>
							<input {...register("last_name", { required: "Required" })} />
							{errors.last_name && <p className="error-msg">{errors.last_name.message}</p>}
						</div>
					</div>

					<div className="input-group">
						<label>Mot de passe</label>
						<input 
							type="password"
							{...register("password", { 
								required: "Password required", 
								minLength: { value: 8, message: "Min 8 characters" },
								pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, message: "Has to contain upper and lower character, digit and special character" }
							})} 
						/>
						{errors.password && <p className="error-msg">{errors.password.message}</p>}
					</div>

					<button type="submit" className="btn">S'inscrire</button>
				</form>

				<p className="center" style={{ marginTop: '1.5rem' }}>
					Already registered ? <Link to="/login" className="link">Login</Link>
				</p>
			</div>
		</div>
	);
};

export default Register;
