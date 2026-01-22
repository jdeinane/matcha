import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const res = await axios.get("/api/auth/me");

				if (res.data.authenticated) {
					setUser(res.data.user);
				} else {
					setUser(null);
				}
			} catch (err) {
				setUser(null);
			} finally {
				setLoading(false);
			}
		};

		checkAuth();
	}, []);

	const login = async (username, password) => {
		try {
			const res = await axios.post("/api/auth/login", { username, password });
			
			// Check for error response at 200 status
			if (res.data?.success === false || res.data?.error) {
				return res.data;
			}
			
			// Set user on successful login
			if (res.data.user) {
				setUser(res.data.user);
			}
			
			return res.data;
		} catch (error) {
			console.error("Login error:", error);
			throw error;
		}
	};

	const logout = async () => {
		try {
			await axios.post("/api/auth/logout");
			setUser(null);
			window.location.href = "/login";
		} catch (error) {
			console.error("Logout error", error);
		}
	};

	if (loading) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
				<h2>Loading app...</h2>
			</div>
		);
	}

	return (
		<AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
