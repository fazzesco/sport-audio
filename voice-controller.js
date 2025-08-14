// ========================================
// VOICE CONTROLLER - Speech Recognition Module (OTTIMIZZATO)
// ========================================

console.log('🎤 Voice Controller caricato (versione ottimizzata)');

class VoiceController {
    constructor(padelTracker) {
        this.tracker = padelTracker;
        this.recognition = null;
        this.isListening = false;
        this.isEnabled = false;
        this.lastCommand = null;
        this.commandTimeout = null;
        
        // Configurazione OTTIMIZZATA
        this.config = {
            language: 'it-IT',
            continuous: true,
            interimResults: false,
            maxAlternatives: 5, // Più alternative per migliore matching
            // NUOVE ottimizzazioni
            confidenceThreshold: 0.8, // Da 0.6 a 0.8 - meno falsi positivi
            commandMinLength: 8,       // Minimo caratteri comando
            commandMaxLength: 35,      // Massimo caratteri comando
            noiseFilterEnabled: true   // Abilita filtri rumore
        };
        
        // Pattern OTTIMIZZATI per riconoscimento più robusto
        this.patterns = {
            // Comandi punto team - Pattern più specifici con regex
            teamRedPatterns: [
                /\b(punto)\s+(rosso|rossa)\b/i,
                /\b(punto)\s+(team\s+rosso|squadra\s+rossa)\b/i,
                /\b(rosso|rossa)\s+(punto)\b/i
            ],
            teamBluePatterns: [
                /\b(punto)\s+(blu|blue)\b/i,  
                /\b(punto)\s+(team\s+blu|squadra\s+blu)\b/i,
                /\b(blu|blue)\s+(punto)\b/i
            ],
            
            // Comandi informazioni - Pattern più specifici
            scoreRequestPatterns: [
                /\b(dimmi\s+il\s+punteggio|punteggio|quanto|situazione)\b/i,
                /\b(come\s+va|dove\s+siamo|quanto\s+stiamo)\b/i
            ],
            
            // Parole di rumore da ignorare (filtro extra)
            noiseWords: ['bene', 'bello', 'vai', 'forza', 'su', 'dai', 'ok', 'si', 'no', 'ecco']
        };
        
        // Statistiche per debugging
        this.stats = {
            totalCommands: 0,
            successfulCommands: 0,
            rejectedLowConfidence: 0,
            rejectedPattern: 0,
            rejectedLength: 0
        };
        
        this.initSpeechRecognition();
        this.initUI();
        
        console.log('🎤 VoiceController ottimizzato inizializzato:', this.config);
    }
    
    initSpeechRecognition() {
        // Check supporto browser
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            console.warn('❌ Speech Recognition non supportata da questo browser');
            this.showUnsupportedMessage();
            return;
        }
        
        // Setup controllo connessione per Speech API
        this.initConnectionMonitoring();
        
        // Inizializza Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configurazione OTTIMIZZATA
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;
        this.recognition.lang = this.config.language;
        this.recognition.maxAlternatives = this.config.maxAlternatives;
        
        // Event listeners
        this.recognition.onstart = () => this.handleStart();
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);
        this.recognition.onend = () => this.handleEnd();
        
        console.log('🎤 Speech Recognition ottimizzato configurato');
    }
    
    initConnectionMonitoring() {
        // Stato connessione iniziale
        this.isOnline = navigator.onLine;
        
        // Listener per cambi di connessione
        window.addEventListener('online', () => {
            console.log('🌐 Connessione ripristinata');
            this.isOnline = true;
            this.updateConnectionStatus();
        });
        
        window.addEventListener('offline', () => {
            console.log('📵 Connessione persa');
            this.isOnline = false;
            this.stopListening(); // Ferma riconoscimento vocale
            this.updateConnectionStatus();
        });
        
        // Check iniziale
        this.updateConnectionStatus();
        
        console.log('🌐 Connection monitoring inizializzato:', this.isOnline);
    }
    
    updateConnectionStatus() {
        if (!this.isOnline) {
            this.updateVoiceStatus('📵 OFFLINE - Controllo vocale non disponibile', false);
            this.updateToggleButton(false);
        } else if (!this.isEnabled) {
            this.updateVoiceStatus('🎤 Attiva controllo vocale per iniziare', false);
        }
    }
    
    async requestOptimizedMicrophonePermission() {
        // Verifica HTTPS
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            throw new Error('HTTPS richiesto per accesso microfono');
        }
        
        // OTTIMIZZAZIONE: Richiedi microfono con constraints per ridurre rumore
        try {
            const constraints = {
                audio: {
                    // Filtri rumore nativi browser
                    echoCancellation: true,      // Cancella eco
                    noiseSuppression: true,      // Riduce rumore di fondo
                    autoGainControl: true,       // Controllo automatico volume
                    
                    // Ottimizzazioni per voce umana
                    sampleRate: 16000,          // Frequenza ottimale per speech
                    channelCount: 1,            // Mono sufficiente
                    
                    // Filtri avanzati se supportati
                    ...(this.config.noiseFilterEnabled && {
                        googEchoCancellation: true,
                        googAutoGainControl: true, 
                        googNoiseSuppression: true,
                        googHighpassFilter: true,
                        googTypingNoiseDetection: true,
                        googNoiseReduction: true
                    })
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach(track => track.stop()); // Ferma subito
            
            console.log('✅ Permessi microfono ottimizzati verificati');
        } catch (error) {
            console.error('❌ Permessi microfono negati:', error);
            throw new Error('Permessi microfono richiesti');
        }
    }
    
    async startListening() {
        console.log('🎤 Avvio riconoscimento vocale ottimizzato...');
        
        // Verifica connessione prima di iniziare
        if (!this.isOnline) {
            console.warn('📵 Impossibile avviare: dispositivo offline');
            this.updateVoiceStatus('📵 Connessione richiesta per controllo vocale', false);
            return;
        }
        
        try {
            // Richiedi permessi microfono ottimizzati
            await this.requestOptimizedMicrophonePermission();
            
            // Avvia recognition
            this.recognition.start();
            this.isEnabled = true;
            
            // Aggiorna UI
            this.updateToggleButton(true);
            this.updateVoiceStatus('🎤 In ascolto ottimizzato...', true);
            
            console.log('✅ Riconoscimento vocale ottimizzato avviato');
            
        } catch (error) {
            console.error('❌ Errore avvio riconoscimento ottimizzato:', error);
            this.handlePermissionError(error);
        }
    }
    
    handleResult(event) {
        console.log('🎤 Speech recognition result (ottimizzato):', event);
        
        // Ottieni tutti i risultati finali recenti
        const results = event.results;
        
        // Processa ogni risultato finale
        for (let i = event.resultIndex; i < results.length; i++) {
            const result = results[i];
            
            if (result.isFinal) {
                // Analizza tutte le alternative, non solo la prima
                const alternatives = Array.from(result).map(alt => ({
                    transcript: alt.transcript.toLowerCase().trim(),
                    confidence: alt.confidence
                }));
                
                console.log(`🎤 Alternative riconosciute:`, alternatives);
                
                // Processa la migliore alternativa che passa i filtri
                this.processBestAlternative(alternatives);
            }
        }
    }
    
    processBestAlternative(alternatives) {
        this.stats.totalCommands++;
        
        // Ordina per confidence
        alternatives.sort((a, b) => b.confidence - a.confidence);
        
        for (const alt of alternatives) {
            console.log(`🔍 Analizzando: "${alt.transcript}" (conf: ${alt.confidence.toFixed(3)})`);
            
            // FILTRO 1: Confidence minima OTTIMIZZATA
            if (alt.confidence < this.config.confidenceThreshold) {
                console.log(`⚠️ Confidence troppo bassa: ${alt.confidence.toFixed(3)} < ${this.config.confidenceThreshold}`);
                this.stats.rejectedLowConfidence++;
                continue;
            }
            
            // FILTRO 2: Lunghezza comando OTTIMIZZATA
            if (alt.transcript.length < this.config.commandMinLength || 
                alt.transcript.length > this.config.commandMaxLength) {
                console.log(`⚠️ Lunghezza comando non valida: ${alt.transcript.length} caratteri`);
                this.stats.rejectedLength++;
                continue;
            }
            
            // FILTRO 3: Pattern matching OTTIMIZZATO
            const commandType = this.recognizeOptimizedCommand(alt.transcript);
            
            if (commandType) {
                // Comando valido trovato!
                console.log(`✅ Comando riconosciuto:`, commandType);
                this.executeCommand(commandType, alt.transcript);
                this.stats.successfulCommands++;
                return; // Esci dopo primo comando valido
            }
        }
        
        // Nessuna alternativa valida
        this.stats.rejectedPattern++;
        console.log(`❓ Nessun comando valido trovato nelle alternative`);
        this.updateVoiceStatus('❓ Comando non riconosciuto', false);
        this.showQuickHelp();
    }
    
    recognizeOptimizedCommand(transcript) {
        const text = transcript.toLowerCase().trim();
        
        // FILTRO RUMORE: Ignora parole comuni di disturbo
        const hasOnlyNoise = this.patterns.noiseWords.every(noise => 
            !text.includes(noise) || text === noise
        );
        
        if (this.patterns.noiseWords.includes(text)) {
            console.log(`🚫 Parola rumore ignorata: "${text}"`);
            return null;
        }
        
        // PATTERN MATCHING OTTIMIZZATO con regex precise
        
        // Test comandi punto team rosso
        for (const pattern of this.patterns.teamRedPatterns) {
            if (pattern.test(text)) {
                console.log(`🔴 Pattern Team Rosso riconosciuto: ${pattern}`);
                return { type: 'point', team: 'rosso', teamIndex: 1, pattern: pattern.toString() };
            }
        }
        
        // Test comandi punto team blu  
        for (const pattern of this.patterns.teamBluePatterns) {
            if (pattern.test(text)) {
                console.log(`🔵 Pattern Team Blu riconosciuto: ${pattern}`);
                return { type: 'point', team: 'blu', teamIndex: 2, pattern: pattern.toString() };
            }
        }
        
        // Test richieste punteggio
        for (const pattern of this.patterns.scoreRequestPatterns) {
            if (pattern.test(text)) {
                console.log(`📊 Pattern Richiesta Punteggio riconosciuto: ${pattern}`);
                return { type: 'score_request', pattern: pattern.toString() };
            }
        }
        
        return null;
    }
    
    executePointCommand(command, originalText) {
        const { team, teamIndex } = command;
        
        console.log(`🎾 COMANDO CONFERMATO: Aggiungendo punto a Team ${team}`);
        
        // Aggiungi punto tramite tracker
        this.tracker.addPoint(teamIndex);
        
        // Feedback vocale ottimizzato
        this.updateVoiceStatus(`✅ PUNTO Team ${team.toUpperCase()}!`, false);
        this.tracker.updateLastAnnouncement(`✅ "${originalText}" → Punto ${team}`);
        
        // Breve pausa prima di riprendere ascolto per evitare retriggering
        setTimeout(() => {
            if (this.isEnabled) {
                this.updateVoiceStatus('🎤 In ascolto...', true);
            }
        }, 1500);
        
        console.log(`✅ Punto aggiunto a Team ${team} - Stats:`, this.getStats());
    }
    
    executeScoreRequest(originalText) {
        console.log(`📊 RICHIESTA PUNTEGGIO CONFERMATA`);
        
        // Ottieni testo punteggio
        const scoreText = this.tracker.getScoreText();
        const fullScore = `${scoreText.pointsText}, ${scoreText.gamesText}`;
        
        // Feedback vocale
        this.updateVoiceStatus(`📊 ${fullScore}`, false);
        this.tracker.updateLastAnnouncement(`📊 "${originalText}" → ${fullScore}`);
        
        setTimeout(() => {
            if (this.isEnabled) {
                this.updateVoiceStatus('🎤 In ascolto...', true);
            }
        }, 2000);
        
        console.log(`📊 Punteggio comunicato: ${fullScore}`);
    }
    
    // Metodi esistenti invariati...
    initUI() {
        this.createVoiceToggle();
        this.updateVoiceStatus('🎤 Attiva controllo vocale per iniziare', false);
    }
    
    createVoiceToggle() {
        const voiceStatus = document.querySelector('.voice-status');
        
        const toggleContainer = document.createElement('div');
        toggleContainer.style.cssText = `
            margin-top: 10px;
            display: flex;
            justify-content: center;
            gap: 10px;
        `;
        
        const voiceToggle = document.createElement('button');
        voiceToggle.id = 'voiceToggle';
        voiceToggle.className = 'voice-toggle-btn';
        voiceToggle.textContent = '🎤 Attiva Vocale';
        voiceToggle.style.cssText = `
            background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
            border: none;
            border-radius: 10px;
            padding: 8px 16px;
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
        `;
        
        const infoBtn = document.createElement('button');
        infoBtn.id = 'voiceInfo';
        infoBtn.className = 'voice-info-btn';
        infoBtn.textContent = '❓ Aiuto';
        infoBtn.style.cssText = `
            background: linear-gradient(135deg, #607d8b 0%, #455a64 100%);
            border: none;
            border-radius: 10px;
            padding: 8px 16px;
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
        `;
        
        
        // Event listeners
        voiceToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleVoice();
        });
        
        voiceToggle.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.toggleVoice();
        });
        
        infoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });
        
        infoBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showHelp();
        });
        
        
        // Visual feedback
        [voiceToggle, infoBtn].forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.style.transform = 'scale(0.95)';
            });
            
            btn.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                }, 200);
            });
        });
        
        toggleContainer.appendChild(voiceToggle);
        toggleContainer.appendChild(infoBtn);
        voiceStatus.appendChild(toggleContainer);
        
        console.log('🎤 UI controlli vocali ottimizzati creati');
    }
    
    async toggleVoice() {
        if (!this.recognition) {
            this.showUnsupportedMessage();
            return;
        }
        
        // Verifica connessione prima di attivare
        if (!this.isOnline && !this.isEnabled) {
            this.updateVoiceStatus('📵 Connessione internet richiesta', false);
            return;
        }
        
        if (this.isEnabled) {
            this.stopListening();
        } else {
            await this.startListening();
        }
    }
    
    stopListening() {
        console.log('🎤 Arresto riconoscimento vocale...');
        
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        this.isEnabled = false;
        this.isListening = false;
        
        this.updateToggleButton(false);
        this.updateVoiceStatus('🎤 Controllo vocale disattivato', false);
        
        console.log('⏹️ Riconoscimento vocale arrestato');
    }
    
    handleStart() {
        console.log('🎤 Speech recognition started (ottimizzato)');
        this.isListening = true;
        this.updateVoiceStatus('🎤 In ascolto ottimizzato...', true);
    }
    
    handleError(event) {
        console.error('❌ Speech recognition error (ottimizzato):', event.error);
        
        let errorMessage = 'Errore riconoscimento vocale';
        
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'Nessun audio rilevato';
                break;
            case 'audio-capture':
                errorMessage = 'Microfono non disponibile';
                break;
            case 'not-allowed':
                errorMessage = 'Permessi microfono negati';
                this.handlePermissionError();
                return;
            case 'network':
                errorMessage = 'Errore di rete';
                break;
            case 'service-not-allowed':
                errorMessage = 'Servizio non disponibile';
                break;
        }
        
        this.updateVoiceStatus(`❌ ${errorMessage}`, false);
        
        // Auto-restart più intelligente
        if (['no-speech', 'audio-capture'].includes(event.error) && this.isEnabled) {
            const retryDelay = event.error === 'no-speech' ? 500 : 2000;
            setTimeout(() => {
                if (this.isEnabled) {
                    console.log('🔄 Tentativo auto-restart ottimizzato...');
                    this.recognition.start();
                }
            }, retryDelay);
        }
    }
    
    handleEnd() {
        console.log('🎤 Speech recognition ended (ottimizzato)');
        this.isListening = false;
        
        // Auto-restart più intelligente con backoff
        if (this.isEnabled) {
            const restartDelay = Math.min(100 + (this.stats.totalCommands * 10), 1000);
            setTimeout(() => {
                if (this.isEnabled && this.recognition) {
                    console.log('🔄 Auto-restart ottimizzato...');
                    try {
                        this.recognition.start();
                    } catch (error) {
                        console.error('❌ Errore auto-restart ottimizzato:', error);
                    }
                }
            }, restartDelay);
        }
    }
    
    processCommand(transcript, confidence) {
        // Metodo legacy mantenuto per compatibilità
        this.processBestAlternative([{ transcript, confidence }]);
    }
    
    executeCommand(command, originalText) {
        console.log(`⚡ Eseguendo comando ottimizzato:`, command);
        
        if (this.commandTimeout) {
            clearTimeout(this.commandTimeout);
        }
        
        switch (command.type) {
            case 'point':
                this.executePointCommand(command, originalText);
                break;
                
            case 'score_request':
                this.executeScoreRequest(originalText);
                break;
                
            default:
                console.warn(`❓ Tipo comando sconosciuto: ${command.type}`);
        }
        
        // Reset status con delay più lungo per comandi confermati
        this.commandTimeout = setTimeout(() => {
            if (this.isEnabled) {
                this.updateVoiceStatus('🎤 In ascolto...', true);
            }
        }, 4000);
    }
    
    updateToggleButton(isEnabled) {
        const toggleBtn = document.getElementById('voiceToggle');
        if (toggleBtn) {
            if (isEnabled) {
                toggleBtn.textContent = '🔇 Disattiva Vocale';
                toggleBtn.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
            } else {
                toggleBtn.textContent = '🎤 Attiva Vocale';
                toggleBtn.style.background = 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)';
            }
        }
    }
    
    updateVoiceStatus(message, isListening) {
        this.tracker.updateVoiceStatus(message, isListening);
    }
    
    showHelp() {
        const helpText = `
COMANDI VOCALI OTTIMIZZATI:

🎾 AGGIUNTA PUNTI (migliorati):
• "punto rosso" 
• "punto squadra rossa"
• "rosso punto"
• "punto blu"
• "punto team blu" 
• "blu punto"

📊 RICHIESTA PUNTEGGIO:
• "dimmi il punteggio"
• "punteggio"
• "quanto stiamo?"
• "situazione"

⚡ OTTIMIZZAZIONI ATTIVE:
• Filtro rumore migliorato
• Confidence 80% (vs 60%)
• Pattern matching più preciso
• Controllo lunghezza comandi

💡 SUGGERIMENTI:
• Parla chiaramente e aspetta
• Usa frasi complete
• Distanza max 4 metri
• Evita parole extra
        `;
        
        alert(helpText);
    }
    
    showQuickHelp() {
        this.tracker.updateLastAnnouncement('💡 Dì: "punto rosso/blu" o "dimmi punteggio"');
    }
    
    // NUOVO: Statistiche per debugging
    showStats() {
        const stats = this.getStats();
        const accuracy = stats.totalCommands > 0 ? 
            ((stats.successfulCommands / stats.totalCommands) * 100).toFixed(1) : 0;
            
        const statsText = `
STATISTICHE RICONOSCIMENTO VOCALE:

📊 PERFORMANCE:
• Comandi totali: ${stats.totalCommands}
• Comandi riusciti: ${stats.successfulCommands}
• Accuratezza: ${accuracy}%

❌ COMANDI RIFIUTATI:
• Confidence bassa: ${stats.rejectedLowConfidence}
• Pattern non valido: ${stats.rejectedPattern}  
• Lunghezza errata: ${stats.rejectedLength}

⚙️ CONFIGURAZIONE:
• Confidence minima: ${this.config.confidenceThreshold}
• Lunghezza min/max: ${this.config.commandMinLength}/${this.config.commandMaxLength}
• Filtri rumore: ${this.config.noiseFilterEnabled ? 'ON' : 'OFF'}
        `;
        
        alert(statsText);
    }
    
    getStats() {
        return { ...this.stats };
    }
    
    resetStats() {
        this.stats = {
            totalCommands: 0,
            successfulCommands: 0,
            rejectedLowConfidence: 0,
            rejectedPattern: 0,
            rejectedLength: 0
        };
        console.log('📊 Statistiche voice controller resettate');
    }
    
    showUnsupportedMessage() {
        this.updateVoiceStatus('❌ Browser non supporta riconoscimento vocale', false);
        
        const helpMessage = `
Il tuo browser non supporta il riconoscimento vocale ottimizzato.

BROWSER SUPPORTATI:
• Chrome (Mobile/Desktop) ✅
• Edge (Mobile/Desktop) ✅  
• Safari (limitato) ⚠️
• Firefox (non supportato) ❌

Usa i controlli manuali per aggiungere punti.
        `;
        
        setTimeout(() => {
            alert(helpMessage);
        }, 1000);
    }
    
    handlePermissionError() {
        this.stopListening();
        
        const permissionMessage = `
PERMESSI MICROFONO RICHIESTI (OTTIMIZZATI)

Per usare i comandi vocali con filtri rumore:

1. 📱 Clicca sull'icona microfono nella barra URL
2. 🔓 Seleziona "Consenti" 
3. 🔄 Ricarica la pagina
4. 🎤 Riattiva controllo vocale

IMPORTANTE:
• Serve connessione HTTPS
• Filtri rumore attivi per campo padel
• Confidence 80% per meno errori
        `;
        
        alert(permissionMessage);
        this.updateVoiceStatus('❌ Permessi microfono ottimizzati richiesti', false);
    }
}

// Estendi il PadelVoiceTracker esistente quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.padelVoiceTracker) {
            console.log('🔧 Estendendo con controllo vocale ottimizzato...');
            window.padelVoiceTracker.voiceController = new VoiceController(window.padelVoiceTracker);
            console.log('✅ Voice Controller ottimizzato integrato!');
        } else {
            console.error('❌ PadelVoiceTracker non trovato!');
        }
    }, 200);
});

// Fallback se DOMContentLoaded già passato
if (document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.padelVoiceTracker && !window.padelVoiceTracker.voiceController) {
            console.log('🔄 Fallback: Integrando Voice Controller ottimizzato...');
            window.padelVoiceTracker.voiceController = new VoiceController(window.padelVoiceTracker);
            console.log('✅ Voice Controller ottimizzato integrato via fallback!');
        }
    }, 300);
}
