import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "../../../backend/src/schemas.js";
import axios from "axios";

const Register = () => {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting }
	 } = useForm({
		resolver: zodResolver(registerSchema),
		mode: "onChange"
	 });
	
	const navigate = useNavigate();

	const onSubmit = async (data) => {
		try {
			await axios.post("/api/auth/register", data);

			toast.success("Successfully registered! Please check your mailbox.");
			navigate("/login");

		} catch (error) {
			const message = error.response?.data?.error || "An error has occurred";
			toast.error(message);
		}
	};

	return (
		<div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
			<div className="card" style={{ width: '100%', maxWidth: '400px' }}>
				<h1 className="center" style={{ marginBottom: '2rem' }}>🍵 Matcha</h1>
				<h2 className="center" style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Create account</h2>
				
				<form onSubmit={handleSubmit(onSubmit)} className="flex-col">
					
					<div className="input-group">
						<label>Username</label>
						<input {...register("username")} />
						{errors.username && <p className="error-msg">{errors.username.message}</p>}
					</div>

					<div className="input-group">
						<label>Email</label>
						<input type="email" {...register("email")} placeholder="Ex: love@matcha.com" />
						{errors.email && <p className="error-msg">{errors.email.message}</p>}
					</div>

					<div style={{ display: 'flex', gap: '10px' }}>
						<div className="input-group" style={{ flex: 1 }}>
							<label>First name</label>
							<input {...register("first_name", { required: "Required" })} />
							{errors.first_name && <p className="error-msg">{errors.first_name.message}</p>}
						</div>
						<div className="input-group" style={{ flex: 1 }}>
							<label>Last name</label>
							<input {...register("last_name", { required: "Required" })} />
							{errors.last_name && <p className="error-msg">{errors.last_name.message}</p>}
						</div>
					</div>

					<div className="input-group">
						<label>Birth Date</label>
						<input 
							type="date"
							{...register("birthdate", { required: "Birth date is required" })} 
						/>
						{errors.birthdate && <p className="error-msg">{errors.birthdate.message}</p>}
					</div>

					<div className="input-group">
						<label>Password</label>
						<input 
							type="password"
							{...register("password", { 
								required: "Password required", 
								minLength: { value: 8, message: "Min 8 characters" },
								pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, message: "Must contain uppercase and lowercase letters, a digit, and a special character" }
							})} 
						/>
						{errors.password && <p className="error-msg">{errors.password.message}</p>}
					</div>

					<button type="submit" className="btn" disabled={isSubmitting}>
						{isSubmitting ? "Processing..." : "Register!"}
					</button>
				</form>

				<p className="center" style={{ marginTop: '1.5rem' }}>
					Already registered? <Link to="/login" className="link">Login</Link>
				</p>
			</div>
		</div>
	);
};

export default Register;
