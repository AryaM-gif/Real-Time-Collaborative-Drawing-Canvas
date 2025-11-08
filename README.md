# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd collaborative-canvas
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

## 🧪 Testing with Multiple Users

1. **Open multiple browser windows/tabs** or use different devices on the same network
2. Navigate to `http://localhost:3000` in each window
3. Start drawing in one window - you should see the drawing appear in real-time in all other windows
4. Try drawing simultaneously from multiple windows to test conflict resolution
5. Test undo/redo functionality - actions should be synchronized across all users

### Testing Checklist

- ✅ Real-time drawing synchronization
- ✅ Multiple users drawing simultaneously
- ✅ Cursor position indicators for other users
- ✅ Undo/redo works globally
- ✅ Tool switching (brush/eraser)
- ✅ Color and brush size changes
- ✅ User list updates when users join/leave

## 📁 Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML structure
│   ├── style.css           # Styling
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client
│   └── main.js             # App initialization
├── server/
│   ├── server.ts           # Express + WebSocket server
│   ├── rooms.ts            # Room management
│   └── drawing-state.ts    # Canvas state management
├── package.json
├── tsconfig.json
├── README.md
└── ARCHITECTURE.md
```

## 🎨 Features

### Core Features

- **Real-time Drawing**: See other users' drawings as they draw (not after they finish)
- **Multiple Tools**: Brush and eraser with customizable colors and stroke width
- **User Indicators**: Visual cursor positions showing where other users are drawing
- **Global Undo/Redo**: Undo/redo operations synchronized across all users
- **User Management**: See who's online with color-coded user badges
- **Conflict Resolution**: Handles simultaneous drawing in overlapping areas

### Technical Features

- **Vanilla JavaScript**: No frontend frameworks - pure DOM/Canvas API
- **WebSocket Communication**: Real-time bidirectional communication using Socket.io
- **Efficient Canvas Operations**: Optimized path drawing and redrawing
- **State Synchronization**: Server-side state management for consistency
- **Mobile Support**: Touch events for drawing on mobile devices

## 🐛 Known Limitations

1. **No Persistence**: Canvas state is lost when server restarts
2. **Single Room**: Currently supports one default room (room system is implemented but not exposed in UI)
3. **No Authentication**: Users are identified by socket ID only
4. **Limited Undo History**: Undo stack is in-memory only
5. **No Drawing Export**: Cannot save/export drawings as images
6. **Performance**: May experience lag with 10+ simultaneous users drawing heavily

## ⏱️ Time Spent

- **Initial Setup**: 1 hour
- **Backend Implementation**: 3 hours
- **Frontend Implementation**: 4 hours
- **Real-time Synchronization**: 2 hours
- **Undo/Redo System**: 2 hours
- **UI/UX Polish**: 1.5 hours
- **Testing & Bug Fixes**: 1.5 hours
- **Documentation**: 1 hour

**Total**: ~16 hours

## 🔧 Troubleshooting
## Testing with Multiple Users

Open multiple browser tabs/windows or devices on the same network.
Navigate to http://localhost:3000 in each.
Start drawing in one window — drawings will appear in all others in real-time.
Test simultaneous drawing, undo/redo, and cursor synchronization.

## Testing Checklist

Real-time drawing sync across all users
Multiple users drawing simultaneously
Live cursor indicators
Global undo/redo working correctly
Brush/eraser switching
Color and stroke width changes
User join/leave updates reflected live

### Server won't start

- Ensure port 3000 is not already in use
- Check that all dependencies are installed: `npm install`
- Verify TypeScript compilation: `npm run build`

### Drawings not syncing

- Check browser console for WebSocket connection errors
- Verify server is running and accessible
- Check network connectivity between clients and server

### Canvas not displaying

- Check browser console for JavaScript errors
- Ensure all client files are being served correctly
- Verify canvas element exists in DOM
 ## Core Features
  ## Real-Time Drawing
Instant synchronization using WebSockets.
Smooth stroke rendering and optimized mouse/touch events.

## Tools
Brush and eraser support
Adjustable stroke width and color palette

## Multi-User Collaboration
Each user has a unique color and live cursor indicator
User list updates dynamically

## Global Undo/Redo
Undo/redo operations synchronized across all connected clients
Server maintains shared history

## Architecture Highlights

Event-driven WebSocket model
Server maintains authoritative drawing state
Optimized data batching for minimal network latency

## Technical Highlights
Area	Description
Canvas Operations	Smooth path rendering, high-frequency input handling
Real-Time Events	Efficient event serialization and broadcasting
State Management	Shared undo/redo stack per room
Latency Handling	Client-side prediction and interpolation
Scalability	Designed with modular room system for future scaling

## Technical Challenges Solved
High-Frequency Event Handling — batched and throttled strokes for performance.
Global Undo/Redo — shared operation history synchronized across users.
Conflict Resolution — deterministic ordering of events to avoid desync.
Canvas Consistency — replay of server-approved operations after reconnection.

## 📝 License

MIT

## 👤 Author

Built as a technical assignment demonstrating real-time collaborative application development.


