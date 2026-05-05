import os
import datetime
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from models import get_db, ChatMessage, User
import models
import json
import shutil

router = APIRouter(prefix="/api/chat", tags=["Internal Chat"])

# --- WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        # user_id -> List of WebSocket connections (supporting multiple tabs)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
            # Broadcast status online
            await self.broadcast_status(user_id, "online")
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Broadcast status offline
                return user_id
        return None

    async def broadcast_status(self, user_id: int, status: str):
        msg = json.dumps({"type": "status", "user_id": user_id, "status": status})
        for connections in self.active_connections.values():
            for conn in connections:
                try:
                    await conn.send_text(msg)
                except:
                    pass

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            text_msg = json.dumps(message)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(text_msg)
                except:
                    pass

manager = ConnectionManager()

# --- WEBSOCKET ENDPOINT ---
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # 1. Send Message
            if payload.get("type") == "chat":
                receiver_id = payload.get("receiver_id")
                content = payload.get("message")
                image_url = payload.get("image_url")
                
                new_msg = ChatMessage(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    message=content,
                    image_url=image_url,
                    is_read=0,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)
                
                msg_data = {
                    "type": "chat",
                    "id": new_msg.id,
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "message": content,
                    "image_url": image_url,
                    "created_at": new_msg.created_at.isoformat(),
                    "is_read": 0
                }
                
                # Send to receiver and sender (for sync)
                await manager.send_personal_message(msg_data, receiver_id)
                await manager.send_personal_message(msg_data, user_id)

            # 2. Mark as Read
            elif payload.get("type") == "read_receipt":
                sender_id = payload.get("sender_id") # Pesan dari siapa yang dibaca
                db.query(ChatMessage).filter(
                    ChatMessage.sender_id == sender_id,
                    ChatMessage.receiver_id == user_id,
                    ChatMessage.is_read == 0
                ).update({ChatMessage.is_read: 1})
                db.commit()
                
                # Notify the sender that their messages are read
                await manager.send_personal_message({
                    "type": "read_receipt",
                    "reader_id": user_id,
                    "sender_id": sender_id
                }, sender_id)

    except WebSocketDisconnect:
        disconnected_user = manager.disconnect(websocket, user_id)
        if disconnected_user:
            await manager.broadcast_status(disconnected_user, "offline")

# --- REST API ENDPOINTS ---

@router.get("/users")
def get_chat_users(current_user_id: int, db: Session = Depends(get_db)):
    """Ambil daftar user untuk chat beserta status online dan unread count"""
    users = db.query(User).filter(User.id != current_user_id, User.is_active == 1).all()
    online_users = list(manager.active_connections.keys())
    
    result = []
    for u in users:
        unread = db.query(ChatMessage).filter(
            ChatMessage.sender_id == u.id,
            ChatMessage.receiver_id == current_user_id,
            ChatMessage.is_read == 0
        ).count()
        
        result.append({
            "id": u.id,
            "username": u.username,
            "nama_lengkap": u.nama_lengkap,
            "role": u.role,
            "foto_url": u.foto_url,
            "foto_base64": u.foto_base64,
            "is_online": u.id in online_users,
            "unread_count": unread
        })
    return result

@router.get("/history/{other_user_id}")
def get_chat_history(other_user_id: int, current_user_id: int, db: Session = Depends(get_db)):
    """Ambil riwayat chat antara dua user"""
    messages = db.query(ChatMessage).filter(
        or_(
            (ChatMessage.sender_id == current_user_id) & (ChatMessage.receiver_id == other_user_id),
            (ChatMessage.sender_id == other_user_id) & (ChatMessage.receiver_id == current_user_id)
        )
    ).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.post("/upload")
def upload_chat_image(file: UploadFile = File(...)):
    """Simpan gambar chat ke folder lokal"""
    upload_dir = "uploads/chat"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    filename = f"chat_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/{filepath}"}

@router.delete("/message/{msg_id}")
def delete_chat_message(msg_id: int, current_user_id: int, db: Session = Depends(get_db)):
    """Hapus pesan (hanya pengirim)"""
    msg = db.query(ChatMessage).filter(ChatMessage.id == msg_id, ChatMessage.sender_id == current_user_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Pesan tidak ditemukan atau Anda bukan pengirimnya")
    
    db.delete(msg)
    db.commit()
    return {"status": "success"}

# --- AUTO-DELETE TASK ---
def cleanup_old_messages(db: Session):
    """Pembersihan otomatis pesan > 7 hari"""
    limit = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    deleted = db.query(ChatMessage).filter(ChatMessage.created_at < limit).delete()
    db.commit()
    return deleted
