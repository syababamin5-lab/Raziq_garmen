import React, { useState, useEffect, useRef } from 'react';
import api, { getFileUrl } from '../../api/api';
import { getCurrentUser } from '../../api/authApi';

const ChatSystem = ({ isOpen, onClose, onUnreadUpdate }) => {
    const user = getCurrentUser();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [ws, setWs] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const scrollRef = useRef(null);
    const reconnectTimeout = useRef(null);

    // 1. Fetch Users List
    const fetchUsers = async () => {
        try {
            const res = await api.get(`/chat/users?current_user_id=${user.id}`);
            setUsers(res.data);
            const totalUnread = res.data.reduce((acc, u) => acc + u.unread_count, 0);
            onUnreadUpdate(totalUnread);
        } catch (err) {
            console.error("Failed to fetch chat users", err);
        }
    };

    // 2. WebSocket Connection with Reconnect
    const connectWS = () => {
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Ensure we use the correct backend host
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const socket = new WebSocket(`${protocol}//${host}/api/chat/ws/${user.id}`);

        socket.onopen = () => {
            console.log("Chat WebSocket Connected");
            setIsConnected(true);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chat') {
                // Gunakan functional update untuk menghindari closure stale state
                setMessages(prev => {
                    // Cek apakah pesan sudah ada (mencegah duplikasi jika broadcast sampai ke pengirim juga)
                    if (prev.find(m => m.id === data.id)) return prev;
                    
                    // Filter: hanya tambahkan jika terkait dengan user yang sedang dibuka
                    // Kita akan akses selectedUserRef jika perlu, tapi di sini kita bisa cek data.sender_id
                    return [...prev, data];
                });
                
                // Mark as read jika jendela terbuka dan ini adalah pengirim yang kita pilih
                // Karena kita tidak bisa akses selectedUser yang terbaru di sini dengan mudah tanpa Ref,
                // kita biarkan useEffect history yang menangani atau kirim receipt manual nanti.
                fetchUsers(); 
            } else if (data.type === 'status') {
                setUsers(prev => prev.map(u => u.id === data.user_id ? { ...u, is_online: data.status === 'online' } : u));
            } else if (data.type === 'read_receipt') {
                setMessages(prev => prev.map(m => m.receiver_id === data.reader_id ? { ...m, is_read: 1 } : m));
            }
        };

        socket.onclose = () => {
            console.log("Chat WebSocket Disconnected. Retrying...");
            setIsConnected(false);
            reconnectTimeout.current = setTimeout(connectWS, 3000);
        };

        socket.onerror = (err) => {
            console.error("WebSocket Error:", err);
            socket.close();
        };

        setWs(socket);
    };

    useEffect(() => {
        connectWS();
        return () => {
            if (ws) ws.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, []);

    // 3. Load History when user selected
    useEffect(() => {
        if (selectedUser) {
            api.get(`/chat/history/${selectedUser.id}?current_user_id=${user.id}`).then(res => {
                setMessages(res.data);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'read_receipt', sender_id: selectedUser.id }));
                }
            });
        }
    }, [selectedUser]);

    // Send Read Receipt when messages update
    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.sender_id === selectedUser.id && lastMsg.is_read === 0) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'read_receipt', sender_id: selectedUser.id }));
                }
            }
        }
    }, [messages, selectedUser]);

    useEffect(() => {
        fetchUsers();
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (imageUrl = null) => {
        if ((!input.trim() && !imageUrl) || !selectedUser) return;
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert("Koneksi terputus. Sedang mencoba menyambung kembali...");
            connectWS();
            return;
        }
        
        const payload = {
            type: 'chat',
            receiver_id: selectedUser.id,
            message: input,
            image_url: imageUrl
        };
        ws.send(JSON.stringify(payload));
        setInput('');
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/chat/upload', formData);
            handleSend(res.data.url);
        } catch (err) {
            alert("Gagal upload gambar");
        }
    };

    const handleDelete = async (msgId) => {
        try {
            await api.delete(`/chat/message/${msgId}?current_user_id=${user.id}`);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            alert("Gagal hapus pesan");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-[900px] bg-white h-full shadow-2xl flex overflow-hidden animate-in slide-in-from-right duration-300">
                
                {/* User List Sidebar */}
                <div className={`w-full md:w-[320px] border-r border-slate-100 flex flex-col bg-slate-50 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-slate-100 bg-white">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Internal Chat</h2>
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
                                <button onClick={onClose} className="md:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors" title="Tutup Chat">
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Garmen Connect</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {users.map(u => (
                            <div 
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className={`p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                                    selectedUser?.id === u.id 
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                    : 'hover:bg-white text-slate-600'
                                }`}
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-white flex items-center justify-center font-bold text-sm overflow-hidden text-slate-500">
                                        {(u.foto_base64 || u.foto_url) ? (
                                            <img 
                                                src={u.foto_base64 || getFileUrl(u.foto_url)} 
                                                className="w-full h-full object-cover" 
                                                alt="" 
                                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <span className="w-full h-full flex items-center justify-center" style={{ display: (u.foto_base64 || u.foto_url) ? 'none' : 'flex' }}>
                                            {u.nama_lengkap.charAt(0)}
                                        </span>
                                    </div>
                                    {u.is_online && (
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-black uppercase truncate ${selectedUser?.id === u.id ? 'text-white' : 'text-slate-800'}`}>
                                        {u.nama_lengkap}
                                    </p>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedUser?.id === u.id ? 'text-white/70' : 'text-slate-400'}`}>
                                        {u.role.replace('_', ' ')}
                                    </p>
                                </div>
                                {u.unread_count > 0 && selectedUser?.id !== u.id && (
                                    <div className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                        {u.unread_count}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col bg-white ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
                    {selectedUser ? (
                        <>
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {/* Back Button for mobile */}
                                    <button 
                                        onClick={() => setSelectedUser(null)} 
                                        className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Kembali ke Daftar Kontak"
                                    >
                                        <span className="material-symbols-rounded">arrow_back</span>
                                    </button>
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 overflow-hidden">
                                        {(selectedUser.foto_base64 || selectedUser.foto_url) ? (
                                            <img 
                                                src={selectedUser.foto_base64 || getFileUrl(selectedUser.foto_url)} 
                                                className="w-full h-full object-cover" 
                                                alt="" 
                                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <span className="w-full h-full flex items-center justify-center" style={{ display: (selectedUser.foto_base64 || selectedUser.foto_url) ? 'none' : 'flex' }}>
                                            {selectedUser.nama_lengkap.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase">{selectedUser.nama_lengkap}</p>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${selectedUser.is_online ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {selectedUser.is_online ? 'Online Sekarang' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#E5DDD5] custom-scrollbar bg-opacity-40" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}>
                                {messages.map((m, i) => {
                                    const isMe = m.sender_id === user.id;
                                    return (
                                        <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`group relative max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-4 rounded-[1.5rem] shadow-md text-sm leading-relaxed whitespace-pre-wrap ${
                                                    isMe 
                                                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                                                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                                }`}>
                                                    {m.image_url && (
                                                        <img 
                                                            src={getFileUrl(m.image_url)} 
                                                            className="rounded-xl mb-3 max-w-full cursor-pointer hover:opacity-90 transition-opacity" 
                                                            alt="Chat attachment" 
                                                            onClick={() => window.open(getFileUrl(m.image_url), '_blank')}
                                                        />
                                                    )}
                                                    {m.message}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 px-1">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase bg-white/60 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm">
                                                        {new Date(m.created_at + (m.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && (
                                                        <div className="flex items-center gap-0.5 bg-white/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm">
                                                            <span className={`material-symbols-rounded text-[14px] ${m.is_read ? 'text-blue-500' : 'text-slate-400'}`}>
                                                                {m.is_read ? 'done_all' : 'done'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Action Buttons (Hover) */}
                                                <div className={`absolute top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all ${isMe ? '-left-24' : '-right-24'}`}>
                                                    <button 
                                                        onClick={() => {
                                                            setInput(`[Balas: "${m.message?.substring(0, 30)}${m.message?.length > 30 ? '...' : ''}"]\n\n`);
                                                            document.getElementById('chat-input-field')?.focus();
                                                        }}
                                                        className="p-1.5 rounded-lg bg-white text-slate-400 shadow-sm hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                                                        title="Balas (Reply)"
                                                    >
                                                        <span className="material-symbols-rounded text-[16px]">reply</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setInput(`[Diteruskan]:\n${m.message}`);
                                                            document.getElementById('chat-input-field')?.focus();
                                                        }}
                                                        className="p-1.5 rounded-lg bg-white text-slate-400 shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all"
                                                        title="Teruskan (Forward)"
                                                    >
                                                        <span className="material-symbols-rounded text-[16px]">forward</span>
                                                    </button>
                                                    {isMe && (
                                                        <button 
                                                            onClick={() => handleDelete(m.id)}
                                                            className="p-1.5 rounded-lg bg-white text-red-400 shadow-sm hover:bg-red-50 hover:text-red-600 transition-all"
                                                            title="Hapus Pesan"
                                                        >
                                                            <span className="material-symbols-rounded text-[16px]">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-4 bg-white border-t border-slate-100">
                                <div className="flex items-center gap-3">
                                    <label className="cursor-pointer p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                                        <span className="material-symbols-rounded">attach_file</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                    <input 
                                        id="chat-input-field"
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Ketik pesan internal..."
                                        className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-3.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                    />
                                    <button 
                                        onClick={() => handleSend()}
                                        className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30 hover:bg-slate-900 transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-rounded">send</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                                <span className="material-symbols-rounded text-emerald-500 text-4xl">chat_bubble</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pilih Teman Ngobrol</h3>
                            <p className="text-slate-400 text-sm mt-2 max-w-[300px]">Silakan pilih salah satu anggota tim di sebelah kiri untuk memulai koordinasi internal secara real-time.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatSystem;
