import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { RoomManager } from './rooms';
import { DrawingState } from './drawing-state';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();
const drawingStates = new Map<string, DrawingState>();

// Serve static files from client directory
// Get project root (where package.json is) and serve client from there
const projectRoot = process.cwd();
const clientPath = path.join(projectRoot, 'client');
console.log('Project root:', projectRoot);
console.log('Serving client files from:', clientPath);
app.use(express.static(clientPath));

// Serve index.html at root
app.get('/', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoom: string | null = null;
  let userId: string = socket.id;

  // Join a room (default room for now)
  socket.on('join-room', (roomId: string = 'default') => {
    if (currentRoom) {
      socket.leave(currentRoom);
      roomManager.removeUser(currentRoom, userId);
    }

    currentRoom = roomId;
    socket.join(roomId);
    roomManager.addUser(roomId, userId, socket.id);

    // Initialize drawing state for room if it doesn't exist
    if (!drawingStates.has(roomId)) {
      drawingStates.set(roomId, new DrawingState());
    }

    const drawingState = drawingStates.get(roomId)!;
    const users = roomManager.getUsers(roomId);

    // Send current canvas state to new user
    socket.emit('canvas-state', {
      history: drawingState.getHistory(),
      currentState: drawingState.getCurrentState()
    });

    // Send user list
    io.to(roomId).emit('users-updated', users);

    console.log(`User ${userId} joined room ${roomId}`);
  });

  // Handle drawing events
  socket.on('draw-start', (data: { x: number; y: number; color: string; lineWidth: number; tool: string; strokeId?: string }) => {
    if (!currentRoom) return;

    const drawingState = drawingStates.get(currentRoom)!;
    // Use provided strokeId or generate one
    const strokeId = data.strokeId || uuidv4();
    
    // Start the stroke with the ID
    drawingState.startStroke(userId, { ...data, strokeId });

    // Broadcast to other users in room
    socket.to(currentRoom).emit('draw-start', {
      x: data.x,
      y: data.y,
      color: data.color,
      lineWidth: data.lineWidth,
      tool: data.tool,
      userId,
      strokeId
    });
  });

  socket.on('draw-move', (data: { x: number; y: number; strokeId: string }) => {
    if (!currentRoom) return;

    const drawingState = drawingStates.get(currentRoom)!;
    drawingState.addPoint(data.strokeId, data.x, data.y);

    // Broadcast to other users
    socket.to(currentRoom).emit('draw-move', {
      ...data,
      userId
    });
  });

  socket.on('draw-end', (data: { strokeId: string }) => {
    if (!currentRoom) return;

    const drawingState = drawingStates.get(currentRoom)!;
    drawingState.endStroke(data.strokeId);

    // Broadcast to other users
    socket.to(currentRoom).emit('draw-end', {
      ...data,
      userId
    });
  });

  // Handle cursor position updates
  socket.on('cursor-move', (data: { x: number; y: number }) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('cursor-move', {
      ...data,
      userId
    });
  });

  // Handle undo/redo
  socket.on('undo', () => {
    if (!currentRoom) return;

    const drawingState = drawingStates.get(currentRoom)!;
    const undoneStroke = drawingState.undo();

    if (undoneStroke) {
      // Broadcast undo to all users
      io.to(currentRoom).emit('undo', {
        strokeId: undoneStroke.id,
        userId
      });
    }
  });

  socket.on('redo', () => {
    if (!currentRoom) return;

    const drawingState = drawingStates.get(currentRoom)!;
    const redoneStroke = drawingState.redo();

    if (redoneStroke) {
      // Broadcast redo to all users with full stroke data
      io.to(currentRoom).emit('redo', {
        stroke: redoneStroke,
        userId
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (currentRoom) {
      roomManager.removeUser(currentRoom, userId);
      io.to(currentRoom).emit('users-updated', roomManager.getUsers(currentRoom));
      console.log(`User ${userId} disconnected from room ${currentRoom}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!\n`);
    console.log('To fix this, you can:');
    console.log(`  1. Kill the process using port ${PORT}:`);
    console.log(`     Windows: netstat -ano | findstr :${PORT} (find PID), then taskkill /PID <PID> /F`);
    console.log(`     Mac/Linux: lsof -ti:${PORT} | xargs kill -9`);
    console.log(`  2. Use a different port: PORT=3001 npm start`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

