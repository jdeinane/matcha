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
		<div className="container" style={{display: 'flex', height: '80vh', maxWidth: '1000px', margin: '20px auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)', background: 'white', borderRadius: '8px', overflow: 'hidden'}}>
			
			{/* SIDEBAR */}
			<div style={{width: '300px', borderRight: '1px solid #ddd', overflowY: 'auto', background: '#f9f9f9'}}>
				<h3 style={{padding: '15px', margin: 0, borderBottom: '1px solid #eee'}}>Matches</h3>
				{conversations.length === 0 && <p style={{padding: '15px', color: '#888'}}>No matches yet.</p>}
				
				{conversations.map(conv => (
					<div 
						key={conv.id}
						onClick={() => fetchMessages(conv)}
						style={{
							padding: '15px', 
							cursor: 'pointer', 
							borderBottom: '1px solid #eee',
							background: selectedUser?.id === conv.id ? '#e3f2fd' : 'transparent',
							display: 'flex', alignItems: 'center', gap: '10px'
						}}
					>
						<img 
							src={conv.profile_pic ? `http://localhost:3000${conv.profile_pic}` : "https://via.placeholder.com/40"} 
							style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} 
						/>
						<div style={{overflow: 'hidden'}}>
							<div style={{fontWeight: 'bold'}}>{conv.first_name}</div>
							<div style={{fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
								{conv.lastMessage ? conv.lastMessage.content : "Start chatting!"}
							</div>
						</div>
					</div>
				))}
			</div>

			{/* CHAT WINDOW */}
			<div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
				{selectedUser ? (
					<>
						{/* HEADER */}
						<div style={{padding: '15px', borderBottom: '1px solid #ddd', background: '#fff', fontWeight: 'bold'}}>
							To: {selectedUser.first_name} {selectedUser.last_name}
						</div>

						{/* MESSAGES */}
						<div style={{flex: 1, padding: '20px', overflowY: 'auto', background: '#f5f5f5'}}>
							{messages.map((msg, idx) => {
								const isMe = msg.sender_id === currentUser?.id;
								return (
									<div key={idx} ref={scrollRef} style={{display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '10px'}}>
										<div style={{
											maxWidth: '70%', 
											padding: '10px 15px', 
											borderRadius: '20px',
											background: isMe ? '#2196F3' : 'white',
											color: isMe ? 'white' : 'black',
											boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
										}}>
											{msg.content}
										</div>
									</div>
								);
							})}
						</div>

						{/* INPUT */}
						<form onSubmit={handleSend} style={{padding: '15px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px', background: 'white'}}>
							<input 
								type="text" 
								value={newMessage} 
								onChange={e => setNewMessage(e.target.value)}
								placeholder="Type a message..."
								style={{flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd'}}
							/>
							<button type="submit" className="btn" style={{borderRadius: '20px', padding: '0 20px'}}>Send</button>
						</form>
					</>
				) : (
					<div className="center" style={{height: '100%', color: '#888'}}>
						<h3>Select a conversation to start chatting 💬</h3>
					</div>
				)}
			</div>
		</div>
	);
};

export default Chat;
