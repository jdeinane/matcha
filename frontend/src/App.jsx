import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";

const Dashboard = () => (
	<div className="container center">
		<h1>Welcome to Matcha 🍵</h1>
		<p>You are logged in !</p>
	</div>
);

const Profile = () => <div className="container"><h1>My Profile</h1></div>;

function App() {
return (
		<AuthProvider>
			<BrowserRouter>
				<ToastContainer position="bottom-right" theme="colored" />
				
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					
					<Route element={<ProtectedRoute />}>
							<Route path="/" element={<Dashboard />} />
							<Route path="/profile" element={<Profile />} />
					</Route>

					<Route path="*" element={<Navigate to="/" />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}

export default App;
