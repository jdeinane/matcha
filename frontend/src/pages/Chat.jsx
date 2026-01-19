import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const Chat = () => {
	const { user: currentUser } = useAuth();
	const socket = useSocket();
	const [conversations, setConversations] = useState([]);
	const [selectedUser, setSelectedUser] = useState(null);
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState("");
	const scrollRef = useRef();

	// 1. Initialiser Socket + Charger conversations
	useEffect(() => {
		fetchConversations();
	}, []);

	// 2. Écouter les messages entrants
	useEffect(() => {
		if (!socket) return;
		
		socket.on("message", (msg) => {
			if (selectedUser && (msg.sender_id === selectedUser.id || msg.sender_id === currentUser.id)) {
				const isRelatedToCurrentConv = 
				(msg.sender_id === selectedUser.id) || 
				(msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id);

				if (isRelatedToCurrentConv) {
					setMessages(prev => [...prev, msg]);
				}
			}
			fetchConversations();
		});

		return () => socket.off("message");
	}, [socket, selectedUser, currentUser]);

	// 3. Auto-scroll vers le bas
	useEffect(() => {
		scrollRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const fetchConversations = async () => {
		try {
			const res = await axios.get("/api/chat/conversations");
			setConversations(res.data);
		} catch (err) {
			console.error(err);
		}
	};

	const fetchMessages = async (user) => {
		try {
			setSelectedUser(user);
			const res = await axios.get(`/api/chat/messages/${user.id}`);
			setMessages(res.data);
			setTimeout(() => scrollRef.current?.scrollIntoView(), 100);
		} catch (err) {
			toast.error("Error loading chat");
		}
	};

	const handleSend = async (e) => {
		e.preventDefault();
		if (!newMessage.trim() || !selectedUser) return;

		try {
			const res = await axios.post(`/api/chat/messages/${selectedUser.id}`, { content: newMessage });
			
			setMessages([...messages, res.data]);
			setNewMessage("");
			fetchConversations(); // Update sidebar preview

		} catch (err) {
			toast.error("Message send failed");
		}
	};

	return (
		<div className="container">
			<div className="chat-wrapper">
				{/* SIDEBAR */}
				<div className="chat-sidebar">
					<h3>Matches</h3>
					{conversations.length === 0 && <p style={{padding: '25px', color: 'var(--text-muted)', fontStyle: 'italic'}}>No correspondents yet.</p>}
					{conversations.map(conv => (
						<div 
							key={conv.id}
							onClick={() => fetchMessages(conv)}
							className={`conv-item ${selectedUser?.id === conv.id ? 'active' : ''}`}
						>
							<img 
								src={conv.profile_pic ? `http://localhost:3000${conv.profile_pic}` : "https://via.placeholder.com/40"} 
								alt={conv.first_name}
							/>
							<div style={{overflow: 'hidden', flex: 1}}>
								<div style={{fontFamily: 'var(--font-heading)', fontSize: '1.1rem'}}>{conv.first_name}</div>
								<div style={{fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
									{conv.lastMessage ? conv.lastMessage.content : "New Match"}
								</div>
							</div>
						</div>
					))}
				</div>

				{/* MAIN WINDOW */}
				<div className="chat-main">
					{selectedUser ? (
						<>
							<div className="chat-header">
								Conversation with {selectedUser.first_name}
							</div>

							<div className="messages-container">
								{messages.map((msg, idx) => {
									const isMe = msg.sender_id === currentUser?.id;
									return (
										<div key={idx} className={`message-bubble ${isMe ? 'me' : 'them'}`}>
											{msg.content}
										</div>
									);
								})}
								<div ref={scrollRef} />
							</div>

							<form onSubmit={handleSend} className="chat-input-area">
								<input 
									type="text" 
									value={newMessage} 
									onChange={e => setNewMessage(e.target.value)}
									placeholder="Write your note..."
								/>
								<button type="submit" className="btn">Send</button>
							</form>
						</>
					) : (
						<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center'}}>
							<h3 style={{fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-muted)'}}>Select a soul to start writing.</h3>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Chat;
