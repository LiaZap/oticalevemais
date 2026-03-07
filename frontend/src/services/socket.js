import io from 'socket.io-client';

class SocketService {
  socket;

  connect() {
    if (this.socket) return;

    // Runtime config (docker) > build-time env > fallback
    const RUNTIME_URL = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.VITE_API_URL;
    let BASE = RUNTIME_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // Socket.IO needs the base URL without /api
    if (BASE.endsWith('/api')) BASE = BASE.slice(0, -4);
    this.socket = io(BASE);

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }
}

export const socketService = new SocketService();
