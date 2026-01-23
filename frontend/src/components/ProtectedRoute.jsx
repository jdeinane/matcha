import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = () => {
	const { isAuthenticated, loading, user } = useAuth();

	const location = useLocation();

	if (loading)
		return <div className="center p-10">Loading...</div>;

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	if (user && !user.is_complete && location.pathname !== "/settings") {
		return <Navigate to="/settings" replace />;
	}

	return <Outlet />;
};

export default ProtectedRoute;
