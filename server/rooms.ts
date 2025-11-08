import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  socketId: string;
  color: string;
  name: string;
}

export class RoomManager {
  private rooms: Map<string, Map<string, User>> = new Map();
  private userColors: string[] = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  private colorIndex: number = 0;

  addUser(roomId: string, userId: string, socketId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    const room = this.rooms.get(roomId)!;
    const color = this.userColors[this.colorIndex % this.userColors.length];
    this.colorIndex++;

    room.set(userId, {
      id: userId,
      socketId,
      color,
      name: `User ${userId.substring(0, 6)}`
    });
  }

  removeUser(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.values()) : [];
  }

  getUser(roomId: string, userId: string): User | undefined {
    const room = this.rooms.get(roomId);
    return room?.get(userId);
  }
}

