import io from 'socket.io-client';

class SocketService {
  socket;
  reconnectAttempts = 0;
  maxReconnectAttempts = 10;

  connect() {
    if (this.socket) return;

    // Runtime config (docker) > build-time env > fallback
    const RUNTIME_URL = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.VITE_API_URL;
    let BASE = RUNTIME_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // Socket.IO needs the base URL without /api
    if (BASE.endsWith('/api')) BASE = BASE.slice(0, -4);

    this.socket = io(BASE, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server disconnected — try to reconnect
        this.socket.connect();
      }
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after max attempts');
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
