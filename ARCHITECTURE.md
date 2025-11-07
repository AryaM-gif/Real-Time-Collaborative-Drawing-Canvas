# Architecture Documentation

## Overview

This document describes the architecture, data flow, and technical decisions for the Collaborative Canvas application.

## System Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client 1  │◄─────────────────────────►│             │
└─────────────┘                             │   Server    │
                                            │  (Node.js)  │
┌─────────────┐         WebSocket          │             │
│   Client 2  │◄─────────────────────────►│             │
└─────────────┘                             └─────────────┘
```

## Data Flow Diagram

### Drawing Event Flow

```
User Action (Mouse/Touch)
    │
    ▼
CanvasManager (canvas.js)
    │
    ├─► Local Canvas Rendering (immediate feedback)
    │
    └─► WebSocketManager (websocket.js)
            │
            ▼
        Socket.io Client
            │
            ▼
        Socket.io Server (server.ts)
            │
            ├─► DrawingState (drawing-state.ts) - State Management
            │
            └─► Broadcast to Other Clients
                    │
                    ▼
                Remote Canvas Rendering
```

### State Synchronization Flow

```
Client A: Draw Stroke
    │
    ├─► Server: Store in DrawingState
    │   └─► History Array: [stroke1, stroke2, stroke3]
    │
    └─► Broadcast to Clients B, C, D
        └─► Clients update local canvas
```

## WebSocket Protocol

### Client → Server Messages

#### `join-room`
```javascript
{
  roomId: string  // Optional, defaults to 'default'
}
```
**Purpose**: Join a drawing room. Server responds with current canvas state.

#### `draw-start`
```javascript
{
  x: number,
  y: number,
  color: string,
  lineWidth: number,
  tool: 'brush' | 'eraser',
  strokeId: string  // Client-generated unique ID
}
```
**Purpose**: Signal the start of a new drawing stroke.

#### `draw-move`
```javascript
{
  x: number,
  y: number,
  strokeId: string
}
```
**Purpose**: Add a point to an ongoing stroke. Sent frequently during drawing.

#### `draw-end`
```javascript
{
  strokeId: string
}
```
**Purpose**: Signal the end of a drawing stroke.

#### `cursor-move`
```javascript
{
  x: number,
  y: number
}
```
**Purpose**: Update cursor position for remote cursor indicators.

#### `undo`
```javascript
// No payload
```
**Purpose**: Request undo of the last stroke.

#### `redo`
```javascript
// No payload
```
**Purpose**: Request redo of the last undone stroke.

### Server → Client Messages

#### `canvas-state`
```javascript
{
  history: Stroke[],      // Array of completed strokes in order
  currentState: Stroke[]  // All strokes (for redundancy)
}
```
**Purpose**: Sent when a client joins a room to synchronize state.

#### `draw-start`
```javascript
{
  x: number,
  y: number,
  color: string,
  lineWidth: number,
  tool: 'brush' | 'eraser',
  userId: string,
  strokeId: string
}
```
**Purpose**: Broadcast start of a remote user's stroke.

#### `draw-move`
```javascript
{
  x: number,
  y: number,
  strokeId: string,
  userId: string
}
```
**Purpose**: Broadcast a point in a remote user's stroke.

#### `draw-end`
```javascript
{
  strokeId: string,
  userId: string
}
```
**Purpose**: Broadcast end of a remote user's stroke.

#### `cursor-move`
```javascript
{
  x: number,
  y: number,
  userId: string
}
```
**Purpose**: Update remote cursor position.

#### `undo`
```javascript
{
  strokeId: string,
  userId: string
}
```
**Purpose**: Broadcast undo operation.

#### `redo`
```javascript
{
  stroke: Stroke,  // Full stroke data
  userId: string
}
```
**Purpose**: Broadcast redo operation with full stroke data.

#### `users-updated`
```javascript
User[]  // Array of user objects
```
**Purpose**: Update list of online users.

## Undo/Redo Strategy

### Problem

Global undo/redo is challenging because:
1. Multiple users can perform actions simultaneously
2. Undo operations must be synchronized across all clients
3. Need to maintain operation order for consistency

### Solution

**Server-Side State Management**:
- Server maintains authoritative state in `DrawingState` class
- History is stored as an ordered array of stroke IDs
- Undone strokes are moved to a separate stack

**Implementation**:

```typescript
// Server maintains:
private history: string[] = [];           // Ordered stroke IDs
private undoneStrokes: string[] = [];     // Redo stack
private strokes: Map<string, Stroke>;     // All stroke data
```

**Flow**:
1. Client sends `undo` request
2. Server pops last stroke from `history` → moves to `undoneStrokes`
3. Server broadcasts `undo` event with strokeId to all clients
4. All clients remove that stroke from their canvas

**Conflict Resolution**:
- First-come-first-served: First undo request is processed
- Subsequent undo requests operate on the updated state
- If User A undoes User B's stroke, User B sees it disappear (expected behavior)

**Limitations**:
- No per-user undo history (all users share one history)
- Undo order is global, not per-user
- If two users undo simultaneously, one may see unexpected results

## Performance Decisions

### 1. Canvas Rendering Strategy

**Decision**: Immediate local rendering + server synchronization

**Rationale**:
- Provides instant feedback to the user
- Reduces perceived latency
- Server ensures consistency across clients

**Optimization**:
- Draw line segments incrementally (not full redraw)
- Use `requestAnimationFrame` for smooth rendering
- Batch multiple points if needed (not implemented, but possible)

### 2. Event Batching

**Decision**: Send individual `draw-move` events (not batched)

**Rationale**:
- Simpler implementation
- Lower latency for real-time feel
- Socket.io handles buffering internally

**Trade-off**:
- Higher message count (could be optimized with batching)
- Works well for moderate user counts (< 10 users)

### 3. State Storage

**Decision**: In-memory storage (no database)

**Rationale**:
- Faster access
- Simpler implementation
- Sufficient for assignment requirements

**Trade-off**:
- State lost on server restart
- Not suitable for production without persistence layer

### 4. Canvas Redraw Strategy

**Decision**: Store stroke data, redraw on demand

**Rationale**:
- Allows undo/redo without losing data
- Enables state synchronization for new users
- More memory efficient than storing pixel data

**Implementation**:
```javascript
// Store strokes as arrays of points
stroke: {
  points: [{x, y, timestamp}, ...],
  color, lineWidth, tool
}

// Redraw by iterating through strokes
redraw() {
  clearCanvas();
  strokes.forEach(stroke => redrawStroke(stroke));
}
```

## Conflict Resolution

### Simultaneous Drawing

**Scenario**: Two users draw in overlapping areas at the same time.

**Solution**:
- Each stroke is independent with unique ID
- Strokes are rendered in order received
- Last point drawn "wins" visually (canvas compositing)
- No data loss - both strokes are preserved

**Implementation**:
- Server processes events in order received
- Clients render strokes as they receive events
- Canvas compositing handles visual overlap

### Undo Conflicts

**Scenario**: User A undoes while User B is drawing.

**Solution**:
- Undo operates on completed strokes only
- Active strokes (being drawn) are not affected
- Undo is processed immediately, affecting all clients

**Implementation**:
- Server maintains separate `currentStrokes` (active) and `strokes` (completed)
- Undo only affects completed strokes
- Active strokes continue normally

## Code Organization

### Separation of Concerns

1. **CanvasManager** (`canvas.js`): Canvas operations, rendering, local state
2. **WebSocketManager** (`websocket.js`): Communication, event handling
3. **Main** (`main.js`): UI initialization, event binding
4. **Server** (`server.ts`): WebSocket server, routing
5. **DrawingState** (`drawing-state.ts`): State management, undo/redo logic
6. **RoomManager** (`rooms.ts`): User management, room handling

### Why This Structure?

- **Modularity**: Each module has a single responsibility
- **Testability**: Components can be tested independently
- **Maintainability**: Easy to locate and modify specific functionality
- **Scalability**: Can add features without major refactoring

## Future Improvements

1. **Persistence Layer**: Add database to save canvas state
2. **Room System UI**: Expose room creation/joining in UI
3. **Batching**: Batch `draw-move` events for better performance
4. **Compression**: Compress stroke data for large drawings
5. **Operational Transform**: Implement OT for better conflict resolution
6. **User Authentication**: Add proper user accounts
7. **Drawing Export**: Save/export canvas as image
8. **Shape Tools**: Add rectangle, circle, line tools
9. **Text Tool**: Add text input capability
10. **Layer System**: Support multiple drawing layers

## Technical Stack Rationale

### Why Socket.io over Native WebSockets?

- **Easier API**: Simpler event-based interface
- **Automatic Reconnection**: Built-in reconnection handling
- **Room Support**: Built-in room/namespace features
- **Fallback Support**: Automatic fallback to polling if WebSocket fails
- **Better Error Handling**: More robust error management

### Why TypeScript?

- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: Autocomplete, refactoring
- **Documentation**: Types serve as inline documentation
- **Maintainability**: Easier to maintain large codebase

### Why Vanilla JavaScript (No Frameworks)?

- **Assignment Requirement**: Explicitly requested
- **Performance**: No framework overhead
- **Learning**: Demonstrates raw DOM/Canvas API skills
- **Simplicity**: Easier to understand and debug

## Security Considerations

### Current Implementation

- **No Authentication**: Anyone can connect
- **No Input Validation**: Client data is trusted
- **CORS**: Open to all origins (development only)

### Production Recommendations

1. **Authentication**: Implement user authentication
2. **Input Validation**: Validate all client inputs
3. **Rate Limiting**: Prevent abuse/spam
4. **CORS**: Restrict to specific origins
5. **HTTPS**: Use secure connections
6. **Sanitization**: Sanitize user-generated content

## Performance Metrics

### Expected Performance

- **Latency**: < 50ms for local network
- **Throughput**: ~100 draw-move events/second per user
- **Concurrent Users**: Tested up to 10 users (more may require optimization)
- **Memory**: ~1MB per 1000 strokes (approximate)

### Bottlenecks

1. **Network**: WebSocket message serialization/deserialization
2. **Canvas Rendering**: Redrawing large number of strokes
3. **State Synchronization**: Loading full state for new users

### Optimization Opportunities

1. **Stroke Compression**: Reduce point count for long strokes
2. **Lazy Loading**: Load strokes incrementally for new users
3. **Canvas Layers**: Use multiple canvas layers for better performance
4. **Web Workers**: Offload processing to workers

