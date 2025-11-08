// Main application initialization and coordination
(function() {
    // Initialize canvas manager
    window.canvasManager = new CanvasManager('drawing-canvas', 'cursor-layer');
    
    // Initialize WebSocket manager
    window.wsManager = new WebSocketManager();
    window.wsManager.connect();
    
    // Tool selection
    const toolButtons = document.querySelectorAll('.toolbar-btn[data-tool]');
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
    const colorDisplay = document.getElementById('current-color-display');
    
    const updateColorDisplay = (color) => {
        if (colorDisplay) {
            colorDisplay.style.background = color;
            // Convert hex to rgba for shadow
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            colorDisplay.style.boxShadow = `0 4px 12px rgba(${r}, ${g}, ${b}, 0.3)`;
        }
    };
    
    // Initialize color display
    updateColorDisplay('#9E1C60');
    
    colorInput.addEventListener('change', (e) => {
        const color = e.target.value;
        window.canvasManager.setColor(color);
        updateColorDisplay(color);
    });
    
    // Color presets
    const colorPresets = document.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.getAttribute('data-color');
            window.canvasManager.setColor(color);
            colorInput.value = color;
            updateColorDisplay(color);
        });
    });
    
    // Brush size
    const brushSize = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    const sizePreview = document.getElementById('size-preview');
    
    const updateSizePreview = (size) => {
        sizePreview.style.width = Math.max(8, size) + 'px';
        sizePreview.style.height = Math.max(8, size) + 'px';
    };
    
    brushSize.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        window.canvasManager.setLineWidth(size);
        brushSizeValue.textContent = size + 'px';
        updateSizePreview(size);
    });
    
    // Initialize size preview
    updateSizePreview(5);
    
    // (Undo/Redo buttons handled below once)
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Tool shortcuts
        const toolMap = {
            'b': 'brush',
            'l': 'line',
            'e': 'eraser',
            'f': 'fill',
            's': 'sparkle',
            'r': 'rectangle',
            'q': 'square',
            'c': 'circle',
            't': 'triangle'
        };
        
        if (toolMap[e.key.toLowerCase()]) {
            const tool = toolMap[e.key.toLowerCase()];
            const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
            if (toolBtn) {
                toolBtn.click();
            }
        }
        
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
    
    // Undo/Redo buttons (single declaration)
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            window.wsManager.undo();
        });
    }

    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            window.wsManager.redo();
        });
    }

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

