import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:3001/api/likes/matches", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setMatches)
      .catch(() => navigate("/login"));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Matches 🤝</h1>

      {matches.length === 0 && <p>No matches yet.</p>}

      <ul>
        {matches.map((m) => (
          <li key={m.id}>
            {m.username} — <Link to={`/chat/${m.id}`}>Chat</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
