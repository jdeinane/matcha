import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
						const handleIncomingMessage = (msg) => {
				if (selectedUser && (msg.sender_id === selectedUser.id || msg.sender_id === currentUser.id)) {
					const isRelatedToCurrentConv = 
					(msg.sender_id === selectedUser.id) || 
					(msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id);

					if (isRelatedToCurrentConv) {
						setMessages(prev => [...prev, msg]);
					}
				}
				fetchConversations();
			};

			socket.on("message", handleIncomingMessage);

			return () => {
				socket.off("message", handleIncomingMessage);
			};
		}, [socket, selectedUser, currentUser]);

	// 3. Auto-scroll vers le bas
	useEffect(() => {
		scrollRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const fetchConversations = async () => {
		try {
			const res = await axios.get("/api/chat/conversations");
			
			if (res.data?.success === false || res.data?.error) {
				toast.error(res.data.error || "Failed to load conversations");
				setConversations([]);
				return;
			}
			
			if (!Array.isArray(res.data)) {
				setConversations([]);
				return;
			}
			
			setConversations(res.data);
		} catch (err) {
			toast.error(err.response?.data?.error || "Error loading conversations");
			setConversations([]);
		}
	};

	const fetchMessages = async (user) => {
		try {
			setSelectedUser(user);
			const res = await axios.get(`/api/chat/messages/${user.id}`);
			
			if (res.data?.success === false || res.data?.error) {
				toast.error(res.data.error || "Failed to load messages");
				setMessages([]);
				return;
			}
			
			if (!Array.isArray(res.data)) {
				setMessages([]);
				return;
			}
			
			setMessages(res.data);

			setConversations(prev => prev.map(c => 
			c.id === user.id ? { ...c, unreadCount: 0 } : c
		));
			if (socket) {
				socket.emit("messages_read"); 
			}
			setTimeout(() => scrollRef.current?.scrollIntoView(), 100);
		} catch (err) {
			toast.error(err.response?.data?.error || "Error loading chat");
		}
	};

	const handleSend = async (e) => {
		e.preventDefault();
		if (!newMessage.trim() || !selectedUser) return;

		try {
			const res = await axios.post(`/api/chat/messages/${selectedUser.id}`, { content: newMessage });
			
			if (res.data?.success === false || res.data?.error) {
				toast.error(res.data.error || "Message send failed");
				return;
			}
			
			setMessages([...messages, res.data]);
			setNewMessage("");
			fetchConversations();

		} catch (err) {
			toast.error(err.response?.data?.error || "Message send failed");
		}
	};

	return (
		<div className="container">
			<div className="chat-wrapper">

				<div className={`chat-sidebar ${selectedUser ? 'hidden-on-mobile' : ''}`}>
					<h3>Matches</h3>
					{conversations.length === 0 && <p style={{padding: '25px', color: 'var(--text-muted)', fontStyle: 'italic'}}>No correspondents yet.</p>}
					{conversations.map(conv => (
					<div 
						key={conv.id}
						onClick={() => fetchMessages(conv)}
						className={`conv-item ${selectedUser?.id === conv.id ? 'active' : ''}`}
						style={{ position: 'relative' }}
					>
						<img 
							src={conv.profile_pic ? `http://localhost:3000${conv.profile_pic}` : "https://via.placeholder.com/40"} 
							alt={conv.first_name}
						/>
						<div style={{overflow: 'hidden', flex: 1}}>
							<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
								<span style={{fontFamily: 'var(--font-heading)', fontSize: '1.1rem'}}>{conv.first_name}</span>
								{conv.unreadCount > 0 && selectedUser?.id !== conv.id && (
									<span style={{ 
										backgroundColor: 'var(--matcha)', 
										color: 'white', 
										fontSize: '0.6rem', 
										padding: '2px 7px', 
										borderRadius: '50%' 
									}}>{conv.unreadCount}</span>
								)}
							</div>
							<div style={{fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
								{conv.lastMessage ? conv.lastMessage.content : "New Match"}
							</div>
						</div>
					</div>
				))}
				</div>

				{/* MAIN WINDOW */}
				<div className={`chat-main ${!selectedUser ? 'hidden-on-mobile' : ''}`}>
					{selectedUser ? (
						<>
							<div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<div style={{ display: 'flex', alignItems: 'center' }}>
									<button 
                                        className="back-button" 
                                        onClick={() => setSelectedUser(null)}
                                        title="Back to list"
                                    >
                                        ←
                                    </button>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                                        {selectedUser.first_name}
                                    </span>
								</div>
								
								<Link to={`/user/${selectedUser.id}`} style={{ 
									fontSize: '0.7rem', 
									fontFamily: 'var(--font-accent)', 
									textTransform: 'uppercase', 
									color: 'var(--text-muted)',
									textDecoration: 'none',
									border: '1px solid var(--text-muted)',
									padding: '5px 10px'
								}}>
									View Profile
								</Link>
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
							<h3 style={{fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-muted)'}}>Select conversation.</h3>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Chat;
