import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">Your matcha journey starts here.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {["email", "username", "firstName", "lastName", "password"].map((f) => (
            <input
              key={f}
              className="auth-input"
              placeholder={f}
              type={f === "password" ? "password" : "text"}
              value={form[f]}
              onChange={(e) =>
                setForm({ ...form, [f]: e.target.value })
              }
            />
          ))}
          <button className="auth-button">Create account</button>
        </form>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
