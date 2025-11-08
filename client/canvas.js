// Canvas drawing operations and state management
class CanvasManager {
    constructor(canvasId, cursorLayerId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cursorLayer = document.getElementById(cursorLayerId);
        this.cursorCtx = this.cursorLayer.getContext('2d');
        
        this.isDrawing = false;
        this.currentStroke = null;
        this.startPoint = null;
        this.strokes = new Map(); // strokeId -> stroke data
        this.remoteCursors = new Map(); // userId -> cursor data
        
        this.tool = 'brush';
        this.color = '#9E1C60';
        this.lineWidth = 5;
        
        // For preview (line/shapes)
        this.previewCanvas = document.createElement('canvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        this.setupCanvas();
        this.setupEventListeners();
        this.updateCursor();
    }

    setupCanvas() {
        // Set canvas size to match container
        const resize = () => {
            const container = this.canvas.parentElement;
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            this.canvas.width = width;
            this.canvas.height = height;
            this.cursorLayer.width = width;
            this.cursorLayer.height = height;
            this.previewCanvas.width = width;
            this.previewCanvas.height = height;
            
            // Redraw all strokes after resize
            this.redraw();
        };
        
        resize();
        window.addEventListener('resize', resize);
    }

    updateCursor() {
        const tools = {
            'brush': 'crosshair',
            'eraser': 'grab',
            'line': 'crosshair',
            'fill': 'pointer',
            'sparkle': 'crosshair',
            'rectangle': 'crosshair',
            'square': 'crosshair',
            'circle': 'crosshair',
            'triangle': 'crosshair'
        };
        this.canvas.style.cursor = tools[this.tool] || 'crosshair';
        this.canvas.className = this.tool + '-mode';
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => {
            if (this.tool === 'line' || this.tool === 'rectangle' || this.tool === 'square' || this.tool === 'circle' || this.tool === 'triangle') {
                this.clearPreview();
            }
            this.stopDrawing();
        });
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    startDrawing(e) {
        const coords = this.getCanvasCoordinates(e);
        this.startPoint = coords;
        this.isDrawing = true;
        
        const strokeId = `local-${Date.now()}-${Math.random()}`;
        
        // Handle different tools
        if (this.tool === 'fill') {
            this.floodFill(coords.x, coords.y, this.color);
            this.isDrawing = false;
            return;
        }
        
        if (this.tool === 'line' || this.tool === 'rectangle' || this.tool === 'square' || this.tool === 'circle' || this.tool === 'triangle') {
            // For these tools, we'll preview on mouse move and draw on mouse up
            this.currentStroke = {
                id: strokeId,
                start: coords,
                end: coords,
                color: this.color,
                lineWidth: this.lineWidth,
                tool: this.tool
            };
            return;
        }
        
        // Brush, eraser, sparkle tools
        this.currentStroke = {
            id: strokeId,
            points: [coords],
            color: this.tool === 'eraser' ? '#FFFFFF' : this.color,
            lineWidth: this.lineWidth,
            tool: this.tool
        };
        
        this.strokes.set(strokeId, this.currentStroke);
        
        // Notify WebSocket manager
        if (window.wsManager) {
            window.wsManager.startDrawing(coords, strokeId);
        }
        
        if (this.tool === 'sparkle') {
            this.addSparkle(coords.x, coords.y, this.color);
        } else {
            this.drawPoint(coords, this.currentStroke);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const coords = this.getCanvasCoordinates(e);
        
        // Handle line tool
        if (this.tool === 'line' && this.currentStroke) {
            this.currentStroke.end = coords;
            this.drawPreview();
            return;
        }
        
        // Handle rectangle tool
        if (this.tool === 'rectangle' && this.currentStroke) {
            this.currentStroke.end = coords;
            this.drawPreview();
            return;
        }
        
        // Handle circle tool
        if (this.tool === 'circle' && this.currentStroke) {
            this.currentStroke.end = coords;
            this.drawPreview();
            return;
        }
        
        // Handle square tool
        if (this.tool === 'square' && this.currentStroke) {
            this.currentStroke.end = coords;
            this.drawPreview();
            return;
        }
        
        // Handle triangle tool
        if (this.tool === 'triangle' && this.currentStroke) {
            this.currentStroke.end = coords;
            this.drawPreview();
            return;
        }
        
        // Handle brush, eraser, sparkle
        if (!this.currentStroke) return;
        
        this.currentStroke.points.push(coords);
        
        if (this.tool === 'sparkle') {
            this.addSparkle(coords.x, coords.y, this.color);
            if (window.wsManager) {
                window.wsManager.drawMove(coords, this.currentStroke.id);
            }
        } else {
            // Draw line segment
            const lastPoint = this.currentStroke.points[this.currentStroke.points.length - 2];
            this.drawLine(lastPoint, coords, this.currentStroke);
            
            // Notify WebSocket manager
            if (window.wsManager) {
                window.wsManager.drawMove(coords, this.currentStroke.id);
            }
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        
        // Handle line, rectangle, square, circle, triangle tools
        if ((this.tool === 'line' || this.tool === 'rectangle' || this.tool === 'square' || this.tool === 'circle' || this.tool === 'triangle') && this.currentStroke) {
            this.finishShape();
            this.isDrawing = false;
            this.currentStroke = null;
            this.clearPreview();
            return;
        }
        
        this.isDrawing = false;
        
        if (this.currentStroke && window.wsManager) {
            window.wsManager.endDrawing(this.currentStroke.id);
        }
        
        this.currentStroke = null;
        this.startPoint = null;
    }

    drawPreview() {
        if (!this.currentStroke) return;
        
        // Clear preview
        this.clearPreview();
        
        // Draw preview on main canvas temporarily
        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        this.ctx.strokeStyle = this.currentStroke.color;
        this.ctx.lineWidth = this.currentStroke.lineWidth;
        this.ctx.lineCap = 'round';
        
        if (this.tool === 'line') {
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentStroke.start.x, this.currentStroke.start.y);
            this.ctx.lineTo(this.currentStroke.end.x, this.currentStroke.end.y);
            this.ctx.stroke();
        } else if (this.tool === 'rectangle') {
            const x = Math.min(this.currentStroke.start.x, this.currentStroke.end.x);
            const y = Math.min(this.currentStroke.start.y, this.currentStroke.end.y);
            const width = Math.abs(this.currentStroke.end.x - this.currentStroke.start.x);
            const height = Math.abs(this.currentStroke.end.y - this.currentStroke.start.y);
            this.ctx.strokeRect(x, y, width, height);
        } else if (this.tool === 'square') {
            const deltaX = this.currentStroke.end.x - this.currentStroke.start.x;
            const deltaY = this.currentStroke.end.y - this.currentStroke.start.y;
            const side = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            const x = this.currentStroke.start.x + (deltaX < 0 ? -side : 0);
            const y = this.currentStroke.start.y + (deltaY < 0 ? -side : 0);
            this.ctx.strokeRect(x, y, side, side);
        } else if (this.tool === 'circle') {
            const centerX = (this.currentStroke.start.x + this.currentStroke.end.x) / 2;
            const centerY = (this.currentStroke.start.y + this.currentStroke.end.y) / 2;
            const radiusX = Math.abs(this.currentStroke.end.x - this.currentStroke.start.x) / 2;
            const radiusY = Math.abs(this.currentStroke.end.y - this.currentStroke.start.y) / 2;
            const radius = Math.max(radiusX, radiusY);
            
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (this.tool === 'triangle') {
            const centerX = (this.currentStroke.start.x + this.currentStroke.end.x) / 2;
            const centerY = (this.currentStroke.start.y + this.currentStroke.end.y) / 2;
            const radiusX = Math.abs(this.currentStroke.end.x - this.currentStroke.start.x) / 2;
            const radiusY = Math.abs(this.currentStroke.end.y - this.currentStroke.start.y) / 2;
            const radius = Math.max(radiusX, radiusY);
            
            // Draw equilateral triangle
            this.ctx.beginPath();
            const angle = -Math.PI / 2; // Start from top
            for (let i = 0; i < 3; i++) {
                const currentAngle = angle + (i * 2 * Math.PI / 3);
                const x = centerX + radius * Math.cos(currentAngle);
                const y = centerY + radius * Math.sin(currentAngle);
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    clearPreview() {
        // Redraw all strokes to clear preview
        this.redraw();
    }

    finishShape() {
        if (!this.currentStroke) return;
        
        const strokeId = this.currentStroke.id;
        
        // Convert shape to points for storage
        let points = [];
        
        if (this.tool === 'line') {
            points = [this.currentStroke.start, this.currentStroke.end];
        } else if (this.tool === 'rectangle') {
            const x = Math.min(this.currentStroke.start.x, this.currentStroke.end.x);
            const y = Math.min(this.currentStroke.start.y, this.currentStroke.end.y);
            const width = Math.abs(this.currentStroke.end.x - this.currentStroke.start.x);
            const height = Math.abs(this.currentStroke.end.y - this.currentStroke.start.y);
            points = [
                { x, y },
                { x: x + width, y },
                { x: x + width, y: y + height },
                { x, y: y + height },
                { x, y } // Close the rectangle
            ];
        } else if (this.tool === 'square') {
            const deltaX = this.currentStroke.end.x - this.currentStroke.start.x;
            const deltaY = this.currentStroke.end.y - this.currentStroke.start.y;
            const side = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            const x = this.currentStroke.start.x + (deltaX < 0 ? -side : 0);
            const y = this.currentStroke.start.y + (deltaY < 0 ? -side : 0);
            points = [
                { x, y },
                { x: x + side, y },
                { x: x + side, y: y + side },
                { x, y: y + side },
                { x, y } // Close the square
            ];
        } else if (this.tool === 'circle') {
            const centerX = (this.currentStroke.start.x + this.currentStroke.end.x) / 2;
            const centerY = (this.currentStroke.start.y + this.currentStroke.end.y) / 2;
            const radiusX = Math.abs(this.currentStroke.end.x - this.currentStroke.start.x) / 2;
            const radiusY = Math.abs(this.currentStroke.end.y - this.currentStroke.start.y) / 2;
            const radius = Math.max(radiusX, radiusY);
            
            // Generate circle points
            for (let i = 0; i <= 64; i++) {
                const angle = (i / 64) * Math.PI * 2;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                });
            }
        } else if (this.tool === 'triangle') {
            const centerX = (this.currentStroke.start.x + this.currentStroke.end.x) / 2;
            const centerY = (this.currentStroke.start.y + this.currentStroke.end.y) / 2;
            const radiusX = Math.abs(this.currentStroke.end.x - this.currentStroke.start.x) / 2;
            const radiusY = Math.abs(this.currentStroke.end.y - this.currentStroke.start.y) / 2;
            const radius = Math.max(radiusX, radiusY);
            
            // Generate triangle points (equilateral triangle)
            const angle = -Math.PI / 2; // Start from top
            for (let i = 0; i < 3; i++) {
                const currentAngle = angle + (i * 2 * Math.PI / 3);
                points.push({
                    x: centerX + radius * Math.cos(currentAngle),
                    y: centerY + radius * Math.sin(currentAngle)
                });
            }
            // Close the triangle
            points.push(points[0]);
        }
        
        this.currentStroke.points = points;
        this.strokes.set(strokeId, this.currentStroke);
        
        // Redraw to show final shape
        this.redraw();
        
        // Notify server
        if (window.wsManager) {
            window.wsManager.startDrawing(this.currentStroke.start, strokeId);
            if (points.length > 1) {
                window.wsManager.drawMove(this.currentStroke.end, strokeId);
            }
            window.wsManager.endDrawing(strokeId);
        }
    }

    floodFill(startX, startY, fillColor) {
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Get target color at start point
        const targetColor = this.getPixelColor(data, Math.floor(startX), Math.floor(startY), width);
        
        // Parse fill color
        const fillR = parseInt(fillColor.slice(1, 3), 16);
        const fillG = parseInt(fillColor.slice(3, 5), 16);
        const fillB = parseInt(fillColor.slice(5, 7), 16);
        
        // Check if already filled
        if (this.colorsMatch(targetColor, { r: fillR, g: fillG, b: fillB })) {
            return;
        }
        
        // Flood fill algorithm
        const stack = [{ x: Math.floor(startX), y: Math.floor(startY) }];
        const visited = new Set();
        const pixelsToFill = [];
        
        while (stack.length > 0 && stack.length < 10000) { // Limit to prevent infinite loops
            const { x, y } = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
                continue;
            }
            
            const pixelColor = this.getPixelColor(data, x, y, width);
            if (!this.colorsMatch(pixelColor, targetColor)) {
                continue;
            }
            
            visited.add(key);
            pixelsToFill.push({ x, y });
            
            // Add neighbors
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
        
        // Fill all pixels
        pixelsToFill.forEach(({ x, y }) => {
            this.setPixelColor(data, x, y, width, fillR, fillG, fillB);
        });
        
        // Put image data back
        this.ctx.putImageData(imageData, 0, 0);
        
        // Store as stroke for undo/redo
        const strokeId = `local-${Date.now()}-${Math.random()}`;
        const stroke = {
            id: strokeId,
            points: [{ x: startX, y: startY }],
            color: fillColor,
            lineWidth: 1,
            tool: 'fill',
            fillPixels: pixelsToFill
        };
        this.strokes.set(strokeId, stroke);
        
        // Notify server (simplified - just send the point)
        if (window.wsManager) {
            window.wsManager.startDrawing({ x: startX, y: startY }, strokeId);
            window.wsManager.endDrawing(strokeId);
        }
    }

    getPixelColor(data, x, y, width) {
        const index = (Math.floor(y) * width + Math.floor(x)) * 4;
        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };
    }

    setPixelColor(data, x, y, width, r, g, b) {
        const index = (Math.floor(y) * width + Math.floor(x)) * 4;
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 255;
    }

    colorsMatch(color1, color2) {
        const threshold = 10;
        return Math.abs(color1.r - color2.r) < threshold &&
               Math.abs(color1.g - color2.g) < threshold &&
               Math.abs(color1.b - color2.b) < threshold;
    }

    addSparkle(x, y, color) {
        // Draw sparkle effect
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Main sparkle
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, this.lineWidth * 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, this.adjustBrightness(color, 0.7));
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.lineWidth * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add sparkle particles
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3;
            const distance = this.lineWidth * 1.5;
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
        
        // Store as regular brush stroke for syncing
        if (this.currentStroke) {
            this.currentStroke.points.push({ x, y });
        }
    }

    adjustBrightness(color, factor) {
        const r = Math.min(255, parseInt(color.slice(1, 3), 16) * factor);
        const g = Math.min(255, parseInt(color.slice(3, 5), 16) * factor);
        const b = Math.min(255, parseInt(color.slice(5, 7), 16) * factor);
        return `rgb(${r},${g},${b})`;
    }

    drawPoint(point, stroke) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, stroke.lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = stroke.color;
        this.ctx.fill();
    }

    drawLine(from, to, stroke) {
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        if (stroke.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
        }
        
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = 'source-over';
    }

    // Remote drawing methods
    remoteDrawStart(data) {
        const stroke = {
            id: data.strokeId,
            points: data.tool === 'line' || data.tool === 'rectangle' || data.tool === 'square' || data.tool === 'circle' || data.tool === 'triangle' 
                ? [] 
                : [{ x: data.x, y: data.y }],
            color: data.tool === 'eraser' ? '#FFFFFF' : data.color,
            lineWidth: data.lineWidth,
            tool: data.tool,
            userId: data.userId,
            start: data.tool === 'line' || data.tool === 'rectangle' || data.tool === 'square' || data.tool === 'circle' || data.tool === 'triangle' 
                ? { x: data.x, y: data.y } 
                : null
        };
        
        this.strokes.set(data.strokeId, stroke);
        
        if (data.tool === 'sparkle') {
            this.addSparkle(data.x, data.y, data.color);
        } else if (data.tool !== 'line' && data.tool !== 'rectangle' && data.tool !== 'square' && data.tool !== 'circle' && data.tool !== 'triangle') {
            this.drawPoint({ x: data.x, y: data.y }, stroke);
        }
    }

    remoteDrawMove(data) {
        const stroke = this.strokes.get(data.strokeId);
        if (!stroke) return;
        
        if (stroke.tool === 'sparkle') {
            this.addSparkle(data.x, data.y, stroke.color);
        } else if (stroke.tool === 'line' || stroke.tool === 'rectangle' || stroke.tool === 'square' || stroke.tool === 'circle' || stroke.tool === 'triangle') {
            stroke.end = { x: data.x, y: data.y };
            this.redraw();
        } else {
            const newPoint = { x: data.x, y: data.y };
            stroke.points.push(newPoint);
            
            if (stroke.points.length >= 2) {
                const lastPoint = stroke.points[stroke.points.length - 2];
                this.drawLine(lastPoint, newPoint, stroke);
            }
        }
    }

    remoteDrawEnd(data) {
        const stroke = this.strokes.get(data.strokeId);
        if (stroke && (stroke.tool === 'line' || stroke.tool === 'rectangle' || stroke.tool === 'square' || stroke.tool === 'circle' || stroke.tool === 'triangle')) {
            // Finish the shape for remote users
            if (stroke.start && stroke.end) {
                if (stroke.tool === 'line') {
                    stroke.points = [stroke.start, stroke.end];
                } else if (stroke.tool === 'rectangle') {
                    const x = Math.min(stroke.start.x, stroke.end.x);
                    const y = Math.min(stroke.start.y, stroke.end.y);
                    const width = Math.abs(stroke.end.x - stroke.start.x);
                    const height = Math.abs(stroke.end.y - stroke.start.y);
                    stroke.points = [
                        { x, y },
                        { x: x + width, y },
                        { x: x + width, y: y + height },
                        { x, y: y + height },
                        { x, y }
                    ];
                } else if (stroke.tool === 'square') {
                    const deltaX = stroke.end.x - stroke.start.x;
                    const deltaY = stroke.end.y - stroke.start.y;
                    const side = Math.max(Math.abs(deltaX), Math.abs(deltaY));
                    const x = stroke.start.x + (deltaX < 0 ? -side : 0);
                    const y = stroke.start.y + (deltaY < 0 ? -side : 0);
                    stroke.points = [
                        { x, y },
                        { x: x + side, y },
                        { x: x + side, y: y + side },
                        { x, y: y + side },
                        { x, y }
                    ];
                } else if (stroke.tool === 'circle') {
                    const centerX = (stroke.start.x + stroke.end.x) / 2;
                    const centerY = (stroke.start.y + stroke.end.y) / 2;
                    const radius = Math.max(
                        Math.abs(stroke.end.x - stroke.start.x) / 2,
                        Math.abs(stroke.end.y - stroke.start.y) / 2
                    );
                    stroke.points = [];
                    for (let i = 0; i <= 64; i++) {
                        const angle = (i / 64) * Math.PI * 2;
                        stroke.points.push({
                            x: centerX + radius * Math.cos(angle),
                            y: centerY + radius * Math.sin(angle)
                        });
                    }
                } else if (stroke.tool === 'triangle') {
                    const centerX = (stroke.start.x + stroke.end.x) / 2;
                    const centerY = (stroke.start.y + stroke.end.y) / 2;
                    const radius = Math.max(
                        Math.abs(stroke.end.x - stroke.start.x) / 2,
                        Math.abs(stroke.end.y - stroke.start.y) / 2
                    );
                    const angle = -Math.PI / 2; // Start from top
                    stroke.points = [];
                    for (let i = 0; i < 3; i++) {
                        const currentAngle = angle + (i * 2 * Math.PI / 3);
                        stroke.points.push({
                            x: centerX + radius * Math.cos(currentAngle),
                            y: centerY + radius * Math.sin(currentAngle)
                        });
                    }
                    // Close the triangle
                    stroke.points.push(stroke.points[0]);
                }
            }
            this.redraw();
        }
    }

    // Update remote cursor position
    updateRemoteCursor(userId, x, y, color) {
        this.remoteCursors.set(userId, { x, y, color });
        this.drawCursors();
    }

    drawCursors() {
        // Clear cursor layer
        this.cursorCtx.clearRect(0, 0, this.cursorLayer.width, this.cursorLayer.height);
        
        // Draw all remote cursors
        this.remoteCursors.forEach((cursor, userId) => {
            this.cursorCtx.beginPath();
            this.cursorCtx.arc(cursor.x, cursor.y, 10, 0, Math.PI * 2);
            this.cursorCtx.strokeStyle = cursor.color;
            this.cursorCtx.lineWidth = 2;
            this.cursorCtx.stroke();
            
            this.cursorCtx.beginPath();
            this.cursorCtx.arc(cursor.x, cursor.y, 3, 0, Math.PI * 2);
            this.cursorCtx.fillStyle = cursor.color;
            this.cursorCtx.fill();
        });
    }

    // Undo/Redo operations
    undoStroke(strokeId) {
        const stroke = this.strokes.get(strokeId);
        if (stroke) {
            this.strokes.delete(strokeId);
            this.redraw();
        }
    }

    redoStroke(strokeData) {
        const stroke = {
            id: strokeData.id,
            points: strokeData.points || [],
            color: strokeData.color,
            lineWidth: strokeData.lineWidth,
            tool: strokeData.tool,
            userId: strokeData.userId,
            start: strokeData.start || null,
            end: strokeData.end || null
        };
        this.strokes.set(stroke.id, stroke);
        this.redrawStroke(stroke);
    }

    // Redraw entire canvas
    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all strokes in order
        this.strokes.forEach(stroke => {
            this.redrawStroke(stroke);
        });
    }

    redrawStroke(stroke) {
        if (stroke.tool === 'fill' && stroke.fillPixels) {
            // Redraw fill - batch operation
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const fillR = parseInt(stroke.color.slice(1, 3), 16);
            const fillG = parseInt(stroke.color.slice(3, 5), 16);
            const fillB = parseInt(stroke.color.slice(5, 7), 16);
            
            stroke.fillPixels.forEach(({ x, y }) => {
                this.setPixelColor(imageData.data, x, y, this.canvas.width, fillR, fillG, fillB);
            });
            
            this.ctx.putImageData(imageData, 0, 0);
            return;
        }
        
        if (!stroke.points || stroke.points.length === 0) return;
        
        if (stroke.tool === 'line' && stroke.points.length >= 2) {
            // Draw straight line
            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            this.ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
            this.ctx.strokeStyle = stroke.color;
            this.ctx.lineWidth = stroke.lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        } else if (stroke.tool === 'rectangle' && stroke.points.length >= 4) {
            // Draw rectangle
            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            this.ctx.strokeStyle = stroke.color;
            this.ctx.lineWidth = stroke.lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
        } else if (stroke.tool === 'square' && stroke.points.length >= 4) {
            // Draw square
            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            this.ctx.strokeStyle = stroke.color;
            this.ctx.lineWidth = stroke.lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
        } else if (stroke.tool === 'circle' && stroke.points.length > 0) {
            // Draw circle
            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            this.ctx.strokeStyle = stroke.color;
            this.ctx.lineWidth = stroke.lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        } else if (stroke.tool === 'triangle' && stroke.points.length >= 3) {
            // Draw triangle
            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            this.ctx.strokeStyle = stroke.color;
            this.ctx.lineWidth = stroke.lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
        } else if (stroke.tool === 'sparkle') {
            // Redraw sparkles
            stroke.points.forEach(point => {
                this.addSparkle(point.x, point.y, stroke.color);
            });
        } else {
            // Regular brush/eraser stroke
            if (stroke.points.length > 0) {
                this.drawPoint(stroke.points[0], stroke);
            }
            for (let i = 1; i < stroke.points.length; i++) {
                this.drawLine(stroke.points[i - 1], stroke.points[i], stroke);
            }
        }
    }

    // Load canvas state from server
    loadState(history, currentState) {
        this.strokes.clear();
        
        // Add all strokes from history
        history.forEach(strokeData => {
            const stroke = {
                id: strokeData.id,
                points: strokeData.points,
                color: strokeData.color,
                lineWidth: strokeData.lineWidth,
                tool: strokeData.tool,
                userId: strokeData.userId,
                start: strokeData.start || null,
                end: strokeData.end || null
            };
            this.strokes.set(stroke.id, stroke);
        });
        
        this.redraw();
    }

    // Clear canvas
    clear() {
        this.strokes.clear();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Set tool
    setTool(tool) {
        this.tool = tool;
        this.updateCursor();
    }

    // Set color
    setColor(color) {
        this.color = color;
    }

    // Set line width
    setLineWidth(width) {
        this.lineWidth = width;
    }
}
