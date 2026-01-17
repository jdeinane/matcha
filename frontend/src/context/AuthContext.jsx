import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	const API_URL = import.meta.env.VITE_API_URL;

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const res = await fetch(`${API_URL}/api/auth/me`, {
					credentials: "include"
				});
				const data = await res.json();

				if (data.authenticated && data.user) {
					setUser(data.user);
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
	}, [API_URL]);

	const login = (userData) => {
		setUser(userData);
	};

	const logout = async () => {
		try {
			await fetch(`${API_URL}/api/auth/logout`, { method: "POST" });
			setUser(null);
			window.location.href = "/login";
		} catch (error) {
			console.error("Logout error", error);
		}
	};

	if (loading) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
				<h2>Chargement de l'application... (Vérification Auth)</h2>
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
