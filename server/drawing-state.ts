import { v4 as uuidv4 } from 'uuid';

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  userId: string;
  points: Point[];
  color: string;
  lineWidth: number;
  tool: string; // 'brush' | 'eraser'
  startTime: number;
  endTime?: number;
}

export class DrawingState {
  private strokes: Map<string, Stroke> = new Map();
  private history: string[] = []; // Array of stroke IDs in order
  private undoneStrokes: string[] = []; // Stack for redo
  private currentStrokes: Map<string, Stroke> = new Map(); // Active strokes being drawn

  startStroke(userId: string, data: { x: number; y: number; color: string; lineWidth: number; tool: string; strokeId?: string }): string {
    const strokeId = data.strokeId || uuidv4();
    const stroke: Stroke = {
      id: strokeId,
      userId,
      points: [{ x: data.x, y: data.y, timestamp: Date.now() }],
      color: data.color,
      lineWidth: data.lineWidth,
      tool: data.tool,
      startTime: Date.now()
    };

    this.currentStrokes.set(strokeId, stroke);
    return strokeId;
  }

  addPoint(strokeId: string, x: number, y: number): void {
    const stroke = this.currentStrokes.get(strokeId);
    if (stroke) {
      stroke.points.push({ x, y, timestamp: Date.now() });
    }
  }

  endStroke(strokeId: string): void {
    const stroke = this.currentStrokes.get(strokeId);
    if (stroke) {
      stroke.endTime = Date.now();
      this.strokes.set(strokeId, stroke);
      this.history.push(strokeId);
      this.currentStrokes.delete(strokeId);
      
      // Clear redo stack when new action is performed
      this.undoneStrokes = [];
    }
  }

  undo(): Stroke | null {
    if (this.history.length === 0) return null;

    const strokeId = this.history.pop()!;
    const stroke = this.strokes.get(strokeId);
    
    if (stroke) {
      this.undoneStrokes.push(strokeId);
      return stroke;
    }

    return null;
  }

  redo(): Stroke | null {
    if (this.undoneStrokes.length === 0) return null;

    const strokeId = this.undoneStrokes.pop()!;
    const stroke = this.strokes.get(strokeId);
    
    if (stroke) {
      this.history.push(strokeId);
      return stroke;
    }

    return null;
  }

  getHistory(): Stroke[] {
    return this.history.map(id => this.strokes.get(id)!).filter(Boolean);
  }

  getCurrentState(): Stroke[] {
    return Array.from(this.strokes.values());
  }

  getStroke(strokeId: string): Stroke | undefined {
    return this.strokes.get(strokeId);
  }

  removeStroke(strokeId: string): void {
    this.strokes.delete(strokeId);
    const historyIndex = this.history.indexOf(strokeId);
    if (historyIndex > -1) {
      this.history.splice(historyIndex, 1);
    }
  }
}

