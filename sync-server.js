// ========================================
// WEBSOCKET SYNC SERVER - iPhone ↔ Apple Watch
// ========================================

const WebSocket = require('ws');

// Configurazione server
const PORT = 8081;
const server = new WebSocket.Server({ 
    port: PORT,
    clientTracking: true 
});

// Storage stato partita condiviso
let gameState = {
    score: {
        points: [0, 0],
        games: [0, 0], 
        sets: [0, 0]
    },
    lastAction: '',
    timestamp: Date.now(),
    connectedDevices: 0
};

// Storage connessioni attive
const clients = new Set();

console.log(`🔄 Padel Sync Server avviato su porta ${PORT}`);
console.log(`📱 iPhone e ⌚ Apple Watch possono connettersi a ws://localhost:${PORT}`);

// Gestione nuove connessioni
server.on('connection', (ws, req) => {
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
    console.log(`📱 Nuovo device connesso: ${clientId}`);
    
    // Aggiungi client al set
    clients.add(ws);
    gameState.connectedDevices = clients.size;
    
    // Invia stato corrente al nuovo client
    ws.send(JSON.stringify({
        type: 'state_sync',
        data: gameState,
        message: `Connesso! ${gameState.connectedDevices} device(s) online`
    }));
    
    // Notifica altri client del nuovo dispositivo
    broadcastToOthers(ws, {
        type: 'device_connected',
        data: { connectedDevices: gameState.connectedDevices },
        message: `Nuovo device connesso (${gameState.connectedDevices} totali)`
    });
    
    // Gestione messaggi dal client
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleClientMessage(ws, message, clientId);
        } catch (error) {
            console.error(`❌ Errore parsing messaggio da ${clientId}:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Formato messaggio non valido'
            }));
        }
    });
    
    // Gestione disconnessione
    ws.on('close', () => {
        console.log(`📱 Device disconnesso: ${clientId}`);
        clients.delete(ws);
        gameState.connectedDevices = clients.size;
        
        // Notifica altri client della disconnessione
        broadcastToAll({
            type: 'device_disconnected', 
            data: { connectedDevices: gameState.connectedDevices },
            message: `Device disconnesso (${gameState.connectedDevices} rimasti)`
        });
    });
    
    // Gestione errori connessione
    ws.on('error', (error) => {
        console.error(`❌ Errore WebSocket ${clientId}:`, error);
        clients.delete(ws);
    });
});

// Gestione messaggi dai client
function handleClientMessage(ws, message, clientId) {
    console.log(`📨 Messaggio da ${clientId}:`, message.type);
    
    switch (message.type) {
        case 'add_point':
            handleAddPoint(ws, message.data, clientId);
            break;
            
        case 'undo_point':
            handleUndo(ws, message.data, clientId);
            break;
            
        case 'reset_score':
            handleReset(ws, clientId);
            break;
            
        case 'request_state':
            // Richiesta stato corrente
            ws.send(JSON.stringify({
                type: 'state_sync',
                data: gameState
            }));
            break;
            
        case 'ping':
            // Heartbeat per mantenere connessione attiva
            ws.send(JSON.stringify({
                type: 'pong',
                timestamp: Date.now()
            }));
            break;
            
        default:
            console.warn(`⚠️ Tipo messaggio sconosciuto da ${clientId}:`, message.type);
    }
}

// Gestione aggiunta punto
function handleAddPoint(ws, data, clientId) {
    const { team, score } = data;
    
    // Aggiorna stato server
    gameState.score = score;
    gameState.lastAction = `Punto Team ${team === 1 ? 'Rosso' : 'Blu'}`;
    gameState.timestamp = Date.now();
    
    console.log(`🎾 ${clientId}: ${gameState.lastAction}`);
    console.log(`📊 Nuovo punteggio:`, gameState.score);
    
    // Broadcast a tutti gli altri client
    broadcastToOthers(ws, {
        type: 'score_update',
        data: {
            score: gameState.score,
            team: team,
            action: gameState.lastAction
        },
        sender: clientId,
        timestamp: gameState.timestamp
    });
}

// Gestione undo
function handleUndo(ws, data, clientId) {
    gameState.score = data.score;
    gameState.lastAction = 'Punto annullato (Undo)';
    gameState.timestamp = Date.now();
    
    console.log(`↩️ ${clientId}: Undo eseguito`);
    console.log(`📊 Punteggio ripristinato:`, gameState.score);
    
    broadcastToOthers(ws, {
        type: 'score_undo',
        data: {
            score: gameState.score,
            action: gameState.lastAction
        },
        sender: clientId,
        timestamp: gameState.timestamp
    });
}

// Gestione reset
function handleReset(ws, clientId) {
    gameState.score = {
        points: [0, 0],
        games: [0, 0],
        sets: [0, 0]
    };
    gameState.lastAction = 'Punteggio azzerato (Reset)';
    gameState.timestamp = Date.now();
    
    console.log(`🔄 ${clientId}: Reset partita`);
    
    broadcastToOthers(ws, {
        type: 'score_reset',
        data: {
            score: gameState.score,
            action: gameState.lastAction
        },
        sender: clientId,
        timestamp: gameState.timestamp
    });
}

// Broadcast messaggio a tutti i client tranne il mittente
function broadcastToOthers(sender, message) {
    clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Broadcast messaggio a tutti i client
function broadcastToAll(message) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Gestione shutdown graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Shutdown server...');
    
    // Notifica tutti i client della chiusura
    broadcastToAll({
        type: 'server_shutdown',
        message: 'Server in chiusura...'
    });
    
    // Chiudi tutte le connessioni
    clients.forEach(client => {
        client.close();
    });
    
    // Chiudi server
    server.close(() => {
        console.log('✅ Server chiuso correttamente');
        process.exit(0);
    });
});

// Heartbeat per mantenere connessioni attive
setInterval(() => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'heartbeat',
                timestamp: Date.now(),
                connectedDevices: clients.size
            }));
        }
    });
}, 30000); // Ogni 30 secondi

// Log stato server ogni minuto
setInterval(() => {
    console.log(`📊 Server Status: ${clients.size} device(s) connessi`);
    if (clients.size > 0) {
        console.log(`🎾 Stato partita:`, gameState.score);
    }
}, 60000);

console.log('🚀 Server pronto per sincronizzazione iPhone ↔ Apple Watch');
console.log('📱 Per connettere dispositivi, avvia l\'app e usa WebSocket sync');