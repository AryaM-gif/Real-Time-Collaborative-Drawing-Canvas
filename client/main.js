// Main application initialization and coordination
(function() {
    // Initialize canvas manager
    window.canvasManager = new CanvasManager('drawing-canvas', 'cursor-layer');
    
    // Initialize WebSocket manager
    window.wsManager = new WebSocketManager();
    window.wsManager.connect();
    
    // Tool selection
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tool = btn.getAttribute('data-tool');
            window.canvasManager.setTool(tool);
        });
    });
    
    // Set initial color
    window.canvasManager.setColor('#9E1C60');
    
    // Color picker
    const colorInput = document.getElementById('color-input');
    colorInput.addEventListener('change', (e) => {
        window.canvasManager.setColor(e.target.value);
    });
    
    // Color presets
    const colorPresets = document.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.getAttribute('data-color');
            window.canvasManager.setColor(color);
            colorInput.value = color;
        });
    });
    
    // Brush size
    const brushSize = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    brushSize.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        window.canvasManager.setLineWidth(size);
        brushSizeValue.textContent = size + 'px';
    });
    
    // Undo/Redo buttons
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    undoBtn.addEventListener('click', () => {
        window.wsManager.undo();
    });
    
    redoBtn.addEventListener('click', () => {
        window.wsManager.redo();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z or Cmd+Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            window.wsManager.undo();
        }
        // Ctrl+Shift+Z or Cmd+Shift+Z for redo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            window.wsManager.redo();
        }
    });
    
    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire canvas?')) {
            window.canvasManager.clear();
            // Note: In a full implementation, you'd also notify the server
        }
    });
    
    // Track cursor movement for remote cursor display
    const canvas = document.getElementById('drawing-canvas');
    canvas.addEventListener('mousemove', (e) => {
        if (window.wsManager && window.wsManager.connected) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            window.wsManager.socket.emit('cursor-move', { x, y });
        }
    });
    
    console.log('✨ SyncSketch initialized ✨');
})();

