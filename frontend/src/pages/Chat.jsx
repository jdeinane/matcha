import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function Chat() {
  const { userId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    fetch(`http://localhost:3001/api/messages/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then(setMessages);
  }, [userId]);

  async function sendMessage(e) {
    e.preventDefault();

    await fetch(`http://localhost:3001/api/messages/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ content: text }),
    });

    setMessages([...messages, { content: text, sender_id: "me" }]);
    setText("");
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Chat 💬</h1>

      <div>
        {messages.map((m, i) => (
          <p key={i}>{m.content}</p>
        ))}
      </div>

      <form onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
        />
        <button>Send</button>
      </form>
    </div>
  );
}
