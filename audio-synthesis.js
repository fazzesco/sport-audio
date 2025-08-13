// ========================================
// AUDIO SYNTHESIS - Text-to-Speech Module
// ========================================

console.log('🔊 Audio Synthesis caricato');

class AudioSynthesis {
    constructor(padelTracker) {
        this.tracker = padelTracker;
        this.synthesis = window.speechSynthesis;
        this.voice = null;
        this.isEnabled = true;
        this.isSpeaking = false;
        this.speechQueue = [];
        
        // Configurazione TTS
        this.config = {
            rate: 0.9,          // Velocità (0.1-10)
            pitch: 1.0,         // Tonalità (0-2)
            volume: 0.8,        // Volume (0-1)
            lang: 'it-IT'       // Lingua italiana
        };
        
        this.initVoice();
        this.initUI();
        
        console.log('🔊 AudioSynthesis inizializzato');
    }
    
    initVoice() {
        // Attendi che le voci siano caricate
        if (this.synthesis.getVoices().length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => {
                this.selectItalianVoice();
            });
        } else {
            this.selectItalianVoice();
        }
    }
    
    selectItalianVoice() {
        const voices = this.synthesis.getVoices();
        console.log('🔊 Voci disponibili:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Cerca voce italiana (in ordine di preferenza)
        const italianPreferences = [
            'Google italiano',
            'Microsoft Elsa - Italian',
            'Alice',
            'Luca',
            'Federica'
        ];
        
        // Prima prova con nomi specifici
        for (const prefName of italianPreferences) {
            this.voice = voices.find(v => 
                v.name.toLowerCase().includes(prefName.toLowerCase())
            );
            if (this.voice) break;
        }
        
        // Fallback: qualsiasi voce italiana
        if (!this.voice) {
            this.voice = voices.find(v => 
                v.lang.startsWith('it') || v.lang.includes('IT')
            );
        }
        
        // Ultimo fallback: voce di default
        if (!this.voice && voices.length > 0) {
            this.voice = voices[0];
        }
        
        if (this.voice) {
            console.log('🔊 Voce selezionata:', this.voice.name, this.voice.lang);
        } else {
            console.warn('❌ Nessuna voce disponibile per TTS');
        }
    }
    
    initUI() {
        // Crea toggle TTS nella voice status area
        this.createTTSToggle();
    }
    
    createTTSToggle() {
        const voiceStatus = document.querySelector('.voice-status');
        
        // Trova il container dei bottoni esistente
        let toggleContainer = voiceStatus.querySelector('div:last-child');
        
        if (toggleContainer) {
            // Aggiungi bottone TTS ai controlli esistenti
            const ttsToggle = document.createElement('button');
            ttsToggle.id = 'ttsToggle';
            ttsToggle.className = 'tts-toggle-btn';
            ttsToggle.textContent = '🔊 TTS ON';
            ttsToggle.style.cssText = `
                background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
                border: none;
                border-radius: 10px;
                padding: 8px 16px;
                color: white;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                -webkit-tap-highlight-color: transparent;
                margin-left: 10px;
            `;
            
            // Event listeners
            ttsToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTTS();
            });
            
            ttsToggle.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.toggleTTS();
            });
            
            // Visual feedback
            ttsToggle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                ttsToggle.style.transform = 'scale(0.95)';
            });
            
            ttsToggle.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    ttsToggle.style.transform = 'scale(1)';
                }, 200);
            });
            
            toggleContainer.appendChild(ttsToggle);
            console.log('🔊 TTS toggle creato');
        }
    }
    
    toggleTTS() {
        this.isEnabled = !this.isEnabled;
        this.updateTTSButton();
        
        if (!this.isEnabled) {
            // Ferma TTS corrente se in esecuzione
            this.stopSpeaking();
        }
        
        console.log(`🔊 TTS ${this.isEnabled ? 'attivato' : 'disattivato'}`);
    }
    
    updateTTSButton() {
        const ttsBtn = document.getElementById('ttsToggle');
        if (ttsBtn) {
            if (this.isEnabled) {
                ttsBtn.textContent = '🔊 TTS ON';
                ttsBtn.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
            } else {
                ttsBtn.textContent = '🔇 TTS OFF';
                ttsBtn.style.background = 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)';
            }
        }
    }
    
    // Metodo principale per annunciare il punteggio
    announceScore(immediate = false) {
        if (!this.isEnabled || !this.voice) return;
        
        const scoreData = this.tracker.getScoreText();
        const announcement = this.formatScoreAnnouncement(scoreData);
        
        console.log('🔊 Annuncio punteggio:', announcement);
        
        if (immediate) {
            this.speakImmediately(announcement);
        } else {
            this.speak(announcement);
        }
        
        // Aggiorna UI con ultimo annuncio
        this.tracker.updateLastAnnouncement(`🔊 "${announcement}"`);
    }
    
    // Annuncio dopo ogni punto
    announcePoint(pointType = 'normal') {
        if (!this.isEnabled || !this.voice) return;
        
        const scoreData = this.tracker.getScoreText();
        let announcement = '';
        
        switch (pointType) {
            case 'game':
                announcement = `Game! ${scoreData.gamesText}`;
                break;
            case 'set':
                announcement = `Set! ${scoreData.setsText}`;
                break;
            case 'deuce':
                announcement = 'Parità!';
                break;
            case 'advantage':
                announcement = scoreData.pointsText;
                break;
            default:
                announcement = scoreData.pointsText;
        }
        
        console.log('🔊 Annuncio punto:', announcement);
        this.speak(announcement);
        
        // Aggiorna UI
        this.tracker.updateLastAnnouncement(`🔊 "${announcement}"`);
    }
    
    formatScoreAnnouncement(scoreData) {
        let announcement = scoreData.pointsText;
        
        // Aggiungi games se non sono 0-0
        if (scoreData.gamesText !== '0 game a 0') {
            announcement += `, ${scoreData.gamesText}`;
        }
        
        // Aggiungi sets se non sono 0-0
        if (scoreData.setsText !== '0 set a 0') {
            announcement += `, ${scoreData.setsText}`;
        }
        
        return announcement;
    }
    
    speak(text, priority = 'normal') {
        if (!this.isEnabled || !this.voice || !text) return;
        
        // Aggiungi alla coda
        this.speechQueue.push({ text, priority });
        
        // Processa coda se non sta già parlando
        if (!this.isSpeaking) {
            this.processQueue();
        }
    }
    
    speakImmediately(text) {
        if (!this.isEnabled || !this.voice || !text) return;
        
        // Ferma tutto e parla subito
        this.stopSpeaking();
        this.speechQueue = []; // Svuota coda
        this.performSpeak(text);
    }
    
    processQueue() {
        if (this.speechQueue.length === 0 || this.isSpeaking) return;
        
        // Prendi primo elemento della coda
        const nextSpeech = this.speechQueue.shift();
        this.performSpeak(nextSpeech.text);
    }
    
    performSpeak(text) {
        if (!this.voice || this.isSpeaking) return;
        
        console.log('🔊 Pronunciando:', text);
        this.isSpeaking = true;
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configurazione voce
        utterance.voice = this.voice;
        utterance.rate = this.config.rate;
        utterance.pitch = this.config.pitch;
        utterance.volume = this.config.volume;
        utterance.lang = this.config.lang;
        
        // Event listeners
        utterance.onstart = () => {
            console.log('🔊 TTS iniziato');
        };
        
        utterance.onend = () => {
            console.log('🔊 TTS completato');
            this.isSpeaking = false;
            
            // Processa prossimo elemento in coda
            setTimeout(() => {
                this.processQueue();
            }, 300); // Piccola pausa tra annunci
        };
        
        utterance.onerror = (event) => {
            console.error('❌ Errore TTS:', event.error);
            this.isSpeaking = false;
            
            // Riprova con prossimo elemento
            setTimeout(() => {
                this.processQueue();
            }, 500);
        };
        
        // Pronuncia
        this.synthesis.speak(utterance);
    }
    
    stopSpeaking() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
            console.log('🔊 TTS fermato');
        }
        this.isSpeaking = false;
        this.speechQueue = [];
    }
    
    // Test TTS
    testTTS() {
        const testPhrases = [
            'Test voce italiana',
            'Quindici a zero',
            'Trenta a quindici',
            'Parità',
            'Vantaggio Team Rosso',
            'Game! Due game a uno',
            'Set! Uno set a zero'
        ];
        
        const randomPhrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];
        this.speak(randomPhrase);
        
        console.log('🧪 Test TTS:', randomPhrase);
    }
    
    // Configurazione avanzata (per futuro)
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🔊 Configurazione TTS aggiornata:', this.config);
    }
    
    // Informazioni sistema
    getVoiceInfo() {
        if (!this.voice) return null;
        
        return {
            name: this.voice.name,
            lang: this.voice.lang,
            localService: this.voice.localService,
            isEnabled: this.isEnabled,
            isSpeaking: this.isSpeaking,
            queueLength: this.speechQueue.length
        };
    }
}

// Estendi il PadelVoiceTracker esistente
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che tutti i moduli siano carichi
    setTimeout(() => {
        if (window.padelVoiceTracker) {
            console.log('🔧 Integrando Audio Synthesis...');
            
            // Crea istanza TTS
            window.padelVoiceTracker.audioSynthesis = new AudioSynthesis(window.padelVoiceTracker);
            
            // Hook nei metodi esistenti per TTS automatico
            const originalAddPoint = window.padelVoiceTracker.addPoint;
            window.padelVoiceTracker.addPoint = function(team) {
                // Salva stato precedente
                const prevPoints = [...this.score.points];
                const prevGames = [...this.score.games];
                const prevSets = [...this.score.sets];
                
                // Esegui logica originale
                originalAddPoint.call(this, team);
                
                // Determina tipo di evento per annuncio appropriato
                setTimeout(() => {
                    let pointType = 'normal';
                    
                    // Check se game vinto
                    if (this.score.games[0] !== prevGames[0] || this.score.games[1] !== prevGames[1]) {
                        pointType = 'game';
                        
                        // Check se set vinto
                        if (this.score.sets[0] !== prevSets[0] || this.score.sets[1] !== prevSets[1]) {
                            pointType = 'set';
                        }
                    }
                    // Check deuce/advantage
                    else if (this.score.points[0] >= 3 && this.score.points[1] >= 3) {
                        if (this.score.points[0] === this.score.points[1]) {
                            pointType = 'deuce';
                        } else {
                            pointType = 'advantage';
                        }
                    }
                    
                    // Annuncio TTS automatico
                    this.audioSynthesis.announcePoint(pointType);
                }, 500); // Piccolo delay per permettere ai suoni di finire
            };
            
            // Hook per richieste punteggio vocali
            if (window.padelVoiceTracker.voiceController) {
                const originalExecuteScoreRequest = window.padelVoiceTracker.voiceController.executeScoreRequest;
                window.padelVoiceTracker.voiceController.executeScoreRequest = function(originalText) {
                    // Esegui logica originale (mostra su schermo)
                    originalExecuteScoreRequest.call(this, originalText);
                    
                    // Aggiungi annuncio TTS
                    setTimeout(() => {
                        window.padelVoiceTracker.audioSynthesis.announceScore(true);
                    }, 300);
                };
            }
            
            console.log('✅ Audio Synthesis integrato!');
        } else {
            console.error('❌ PadelVoiceTracker non trovato per integrazione TTS!');
        }
    }, 500);
});

// Fallback per caricamento asincrono
if (document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.padelVoiceTracker && !window.padelVoiceTracker.audioSynthesis) {
            console.log('🔄 Fallback: Integrando Audio Synthesis...');
            window.padelVoiceTracker.audioSynthesis = new AudioSynthesis(window.padelVoiceTracker);
            console.log('✅ Audio Synthesis integrato via fallback!');
        }
    }, 800);
}