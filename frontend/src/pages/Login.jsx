import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const Login = () => {
	const { register, handleSubmit, formState: { errors } } = useForm();
	const navigate = useNavigate();
	const { login } = useAuth();

	const onSubmit = async (data) => {
		try {
			const response = await login(data.username, data.password);

			toast.success("Successfully logged in!");

			if (response && response.user && response.user.is_complete === false) {
				toast.info("Please complete your profile first!");
				navigate("/settings");
			} else {
				navigate("/");
			}

		} catch (error) {
			const message = error.response?.data?.error || "Login failed";
			toast.error(message);
		}
	};

	return (
		<div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
			<div className="card" style={{ width: '100%', maxWidth: '400px' }}>
				<h1 className="center" style={{ marginBottom: '2rem', color: 'var(--matcha)' }}>Matcha</h1>
				
				<h2 className="center" style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Login</h2>
				
				<form onSubmit={handleSubmit(onSubmit)} className="flex-col">
					<div className="input-group">
						<label>Username</label>
						<input 
							{...register("username", { required: "Required" })} 
							placeholder="Username"
						/>
						{errors.username && <p className="error-msg">{errors.username.message}</p>}
					</div>

					<div className="input-group">
						<label>Password</label>
						<input 
							type="password"
							{...register("password", { required: "Required" })} 
						/>
						{errors.password && <p className="error-msg">{errors.password.message}</p>}
					</div>

					<button type="submit" className="btn">Login</button>
				</form>

				<div className="center" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
					<p style={{ margin: 0 }}>
						Not registered yet? <Link to="/register" className="link">Register</Link>
					</p>
					
					<Link to="/forgot-password" style={{ 
						fontFamily: 'var(--font-accent)', 
						fontSize: '0.6rem', 
						textTransform: 'uppercase', 
						color: 'var(--text-muted)', 
						textDecoration: 'none',
						letterSpacing: '0.1em'
					}}>
						Forgot password?
					</Link>
				</div>
			</div>
		</div>
	);
};

export default Login;
