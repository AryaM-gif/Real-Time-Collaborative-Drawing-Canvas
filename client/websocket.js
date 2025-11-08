// WebSocket communication manager
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.userId = null;
        this.currentRoom = 'default';
        this.users = new Map();
    }

    connect() {
        // Guard: if socket.io client script isn't loaded (e.g., running without server),
        // skip connecting so the rest of the app (local drawing) still works.
        if (typeof io === 'undefined') {
            console.warn('socket.io client not found — running in offline/local mode');
            this.connected = false;
            return;
        }

        this.socket = io();
        
        this.socket.on('connect', () => {
            this.connected = true;
            this.userId = this.socket.id;
            this.updateConnectionStatus(true);
            console.log('Connected to server:', this.socket.id);
            
            // Join default room
            this.joinRoom(this.currentRoom);
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            this.updateConnectionStatus(false);
            console.log('Disconnected from server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false);
        });

        // Canvas state synchronization
        this.socket.on('canvas-state', (data) => {
            if (window.canvasManager) {
                window.canvasManager.loadState(data.history, data.currentState);
            }
        });

        // Drawing events from other users
        this.socket.on('draw-start', (data) => {
            if (window.canvasManager && data.userId !== this.userId) {
                window.canvasManager.remoteDrawStart(data);
            }
        });

        this.socket.on('draw-move', (data) => {
            if (window.canvasManager && data.userId !== this.userId) {
                window.canvasManager.remoteDrawMove(data);
            }
        });

        this.socket.on('draw-end', (data) => {
            if (window.canvasManager && data.userId !== this.userId) {
                window.canvasManager.remoteDrawEnd(data);
            }
        });

        // Cursor position updates
        this.socket.on('cursor-move', (data) => {
            if (data.userId !== this.userId && window.canvasManager) {
                const user = this.users.get(data.userId);
                if (user) {
                    window.canvasManager.updateRemoteCursor(
                        data.userId,
                        data.x,
                        data.y,
                        user.color
                    );
                }
            }
        });

        // Undo/Redo events
        this.socket.on('undo', (data) => {
            if (window.canvasManager) {
                window.canvasManager.undoStroke(data.strokeId);
            }
        });

        this.socket.on('redo', (data) => {
            if (window.canvasManager && data.stroke) {
                window.canvasManager.redoStroke(data.stroke);
            }
        });

        // User management
        this.socket.on('users-updated', (users) => {
            this.updateUsersList(users);
        });
    }

    joinRoom(roomId) {
        this.currentRoom = roomId;
        if (this.socket) {
            this.socket.emit('join-room', roomId);
        }
    }

    startDrawing(coords, strokeId) {
        if (!this.connected || !this.socket) return;
        
        const tool = window.canvasManager ? window.canvasManager.tool : 'brush';
        const color = window.canvasManager ? window.canvasManager.color : '#000000';
        const lineWidth = window.canvasManager ? window.canvasManager.lineWidth : 5;
        
        this.socket.emit('draw-start', {
            x: coords.x,
            y: coords.y,
            color: color,
            lineWidth: lineWidth,
            tool: tool,
            strokeId: strokeId
        });
    }

    drawMove(coords, strokeId) {
        if (!this.connected || !this.socket) return;
        
        this.socket.emit('draw-move', {
            x: coords.x,
            y: coords.y,
            strokeId: strokeId
        });
        
        // Also send cursor position
        this.socket.emit('cursor-move', {
            x: coords.x,
            y: coords.y
        });
    }

    endDrawing(strokeId) {
        if (!this.connected || !this.socket) return;
        
        this.socket.emit('draw-end', {
            strokeId: strokeId
        });
    }

    undo() {
        if (!this.connected || !this.socket) return;
        this.socket.emit('undo');
    }

    redo() {
        if (!this.connected || !this.socket) return;
        this.socket.emit('redo');
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-indicator');
        const text = document.getElementById('connection-text');
        
        if (indicator && text) {
            indicator.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
            text.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }

    updateUsersList(users) {
        this.users.clear();
        users.forEach(user => {
            this.users.set(user.id, user);
        });

        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '';
            users.forEach(user => {
                const badge = document.createElement('div');
                badge.className = 'user-badge';
                badge.innerHTML = `
                    <span class="user-color" style="background: ${user.color}"></span>
                    <span>${user.name}</span>
                `;
                usersList.appendChild(badge);
            });
        }
    }
}

