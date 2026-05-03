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
    const scrollRef = useRef(null);

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

    // 2. WebSocket Connection
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const socket = new WebSocket(`${protocol}//${host}/api/chat/ws/${user.id}`);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chat') {
                // Jika pesan untuk chat yang sedang dibuka
                if (selectedUser && (data.sender_id === selectedUser.id || data.sender_id === user.id)) {
                    setMessages(prev => [...prev, data]);
                    // Jika kita yang menerima, tandai sudah baca
                    if (data.sender_id === selectedUser.id) {
                        socket.send(JSON.stringify({ type: 'read_receipt', sender_id: selectedUser.id }));
                    }
                }
                fetchUsers(); // Refresh daftar user untuk unread count
            } else if (data.type === 'status') {
                setUsers(prev => prev.map(u => u.id === data.user_id ? { ...u, is_online: data.status === 'online' } : u));
            } else if (data.type === 'read_receipt') {
                if (selectedUser && data.reader_id === selectedUser.id) {
                    setMessages(prev => prev.map(m => m.receiver_id === selectedUser.id ? { ...m, is_read: 1 } : m));
                }
            }
        };

        setWs(socket);
        return () => socket.close();
    }, [selectedUser]);

    // 3. Load History when user selected
    useEffect(() => {
        if (selectedUser) {
            api.get(`/chat/history/${selectedUser.id}?current_user_id=${user.id}`).then(res => {
                setMessages(res.data);
                // Mark as read immediately
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'read_receipt', sender_id: selectedUser.id }));
                }
            });
        }
    }, [selectedUser]);

    useEffect(() => {
        fetchUsers();
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (imageUrl = null) => {
        if ((!input.trim() && !imageUrl) || !selectedUser || !ws) return;
        
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
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Chat Drawer */}
            <div className="relative w-full max-w-[900px] bg-white h-full shadow-2xl flex overflow-hidden animate-in slide-in-from-right duration-300">
                
                {/* User List Sidebar */}
                <div className="w-[320px] border-r border-slate-100 flex flex-col bg-slate-50">
                    <div className="p-6 border-b border-slate-100 bg-white">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Internal Chat</h2>
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
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-white flex items-center justify-center font-bold text-sm overflow-hidden">
                                        {u.foto_url ? <img src={getFileUrl(u.foto_url)} alt="" /> : u.nama_lengkap.charAt(0)}
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
                <div className="flex-1 flex flex-col bg-white">
                    {selectedUser ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                                        {selectedUser.foto_url ? <img src={getFileUrl(selectedUser.foto_url)} alt="" /> : selectedUser.nama_lengkap.charAt(0)}
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

                            {/* Messages List */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
                                {messages.map((m, i) => {
                                    const isMe = m.sender_id === user.id;
                                    return (
                                        <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`group relative max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm leading-relaxed ${
                                                    isMe 
                                                    ? 'bg-slate-900 text-white rounded-tr-none' 
                                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
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
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && (
                                                        <div className="flex items-center gap-0.5">
                                                            <span className={`material-symbols-rounded text-[14px] ${m.is_read ? 'text-blue-500' : 'text-slate-300'}`}>
                                                                {m.is_read ? 'done_all' : 'done'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isMe && (
                                                    <button 
                                                        onClick={() => handleDelete(m.id)}
                                                        className="absolute -left-10 top-2 p-1.5 rounded-lg bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                        title="Hapus Pesan"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-slate-100">
                                <div className="flex items-center gap-3">
                                    <label className="cursor-pointer p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                                        <span className="material-symbols-rounded">attach_file</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                    <input 
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
