import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "../services/api";

export default function Browse() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Discover 🍵</h1>
      <p>Meet someone worth sharing a matcha with.</p>

      {error && <p>{error}</p>}

      {users.length === 0 && <p>No users yet.</p>}

      <ul>
        {users.map((u) => (
          <li key={u.id}>
            <strong>{u.username}</strong>
            {u.age && ` — ${u.age}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
