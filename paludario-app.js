/* ==================== CONFIGURAZIONE GITHUB ==================== */
// La configurazione viene caricata da config.js

const API_BASE = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}`;
const DATA_FILES = {
    water: 'data/water.json',
    dayTemplate: 'data/dayTemplate.json',
    settings: 'data/settings.json'
};

/* ==================== GESTIONE DATI ==================== */
class DataManager {
    constructor() {
        this.data = {
            water: [],
            dayTemplate: { spray: [], fan: [], lights: [] },
            settings: { title: '🌱 Paludario', liters: '', darkMode: false }
        };
        this.syncInProgress = false;
        this.lastSync = null;
    }

    async loadData() {
        try {
            this.updateStatus('🔄 Caricamento dati...', 'syncing');
            
            // Carica prima i dati locali come fallback
            this.loadFromLocalStorage();
            
            // Prova subito a caricare da GitHub (fonte principale)
            try {
                const [waterData, dayData, settingsData] = await Promise.all([
                    this.fetchFromGitHub(DATA_FILES.water, this.data.water),
                    this.fetchFromGitHub(DATA_FILES.dayTemplate, this.data.dayTemplate),
                    this.fetchFromGitHub(DATA_FILES.settings, this.data.settings)
                ]);

                // Usa sempre i dati di GitHub se disponibili (priorità a GitHub)
                let updated = false;
                if (waterData.length > 0) {
                    this.data.water = waterData;
                    updated = true;
                }
                if (Object.keys(dayData).length > 0) {
                    this.data.dayTemplate = dayData;
                    updated = true;
                }
                if (settingsData.title) {
                    this.data.settings = settingsData;
                    updated = true;
                }
                
                // Aggiorna anche l'array globale se abbiamo dati da GitHub
                if (updated) {
                    this.updateGlobalData();
                }
                
                this.lastSync = new Date();
                this.updateStatus('✅ Dati sincronizzati da GitHub', 'success');
                console.log('Dati caricati da GitHub');
                
            } catch (githubError) {
                console.warn('Caricamento GitHub fallito, uso dati locali:', githubError);
                this.updateStatus('✅ Dati locali (GitHub non disponibile)', 'success');
            }
            
            // Inizializza UI con i dati finali (GitHub o locali)
            this.initializeUI();
            
        } catch (error) {
            console.error('Errore nel caricamento dati:', error);
            this.updateStatus('❌ Errore caricamento', 'error');
            // Fallback ai dati locali
            this.loadFromLocalStorage();
            this.initializeUI();
        }
    }

    async saveData() {
        if (this.syncInProgress) return;
        
        try {
            this.syncInProgress = true;
            this.updateStatus('🔄 Salvataggio...', 'syncing');
            
            // Prima salva localmente (sempre)
            this.saveToLocalStorage();
            
            // Poi prova a salvare su GitHub
            try {
                await Promise.all([
                    this.saveToGitHub(DATA_FILES.water, this.data.water),
                    this.saveToGitHub(DATA_FILES.dayTemplate, this.data.dayTemplate),
                    this.saveToGitHub(DATA_FILES.settings, this.data.settings)
                ]);
                
                this.lastSync = new Date();
                this.updateStatus('✅ Dati salvati su GitHub', 'success');
                console.log('Dati salvati su GitHub');
            } catch (githubError) {
                console.warn('Salvataggio GitHub fallito, dati salvati localmente:', githubError);
                this.updateStatus('✅ Dati salvati localmente', 'success');
            }
            
        } catch (error) {
            console.error('Errore nel salvataggio:', error);
            this.updateStatus('❌ Errore salvataggio', 'error');
            throw error; // Rilancia l'errore per gestirlo nell'UI
        } finally {
            this.syncInProgress = false;
        }
    }

    async fetchFromGitHub(filePath, defaultValue) {
        try {
            const response = await fetch(`${API_BASE}/contents/${filePath}`, {
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return JSON.parse(atob(data.content));
            } else {
                console.log(`File ${filePath} non trovato, uso valori di default`);
                return defaultValue;
            }
        } catch (error) {
            console.error(`Errore nel fetch di ${filePath}:`, error);
            return defaultValue;
        }
    }

    async saveToGitHub(filePath, data) {
        try {
            // Prima ottieni il SHA del file esistente
            let sha = null;
            try {
                const getResponse = await fetch(`${API_BASE}/contents/${filePath}`, {
                    headers: {
                        'Authorization': `token ${GITHUB_CONFIG.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (getResponse.ok) {
                    const fileData = await getResponse.json();
                    sha = fileData.sha;
                    console.log(`File ${filePath} esiste, aggiornamento`);
                } else {
                    console.log(`File ${filePath} non esiste, creazione nuovo file`);
                }
            } catch (e) {
                console.log(`File ${filePath} non esiste, creazione nuovo file`);
            }

            // Codifica sicura per caratteri Unicode
            const jsonString = JSON.stringify(data, null, 2);
            const content = btoa(unescape(encodeURIComponent(jsonString)));
            
            // Prepara il body della richiesta
            const requestBody = {
                message: `Aggiorna ${filePath} - ${new Date().toISOString()}`,
                content: content,
                branch: GITHUB_CONFIG.branch
            };
            
            // Aggiungi SHA solo se il file esiste
            if (sha) {
                requestBody.sha = sha;
            }
            
            const response = await fetch(`${API_BASE}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Errore ${response.status}: ${errorData.message || response.statusText}`);
            }
            
            console.log(`File ${filePath} salvato con successo`);
        } catch (error) {
            console.error(`Errore nel salvataggio di ${filePath}:`, error);
            throw error;
        }
    }

    loadFromLocalStorage() {
        this.data.water = JSON.parse(localStorage.getItem('paludario.waterReadings') || '[]');
        this.data.dayTemplate = JSON.parse(localStorage.getItem('paludario.dayPlanTemplate') || '{"spray":[],"fan":[],"lights":[]}');
        this.data.settings = {
            title: localStorage.getItem('paludario.title') || '🌱 Paludario',
            liters: localStorage.getItem('paludario.liters') || '',
            darkMode: localStorage.getItem('paludario.darkMode') === 'true'
        };
        // Aggiorna i dati globali
        this.updateGlobalData();
    }

    saveToLocalStorage() {
        localStorage.setItem('paludario.waterReadings', JSON.stringify(this.data.water));
        localStorage.setItem('paludario.dayPlanTemplate', JSON.stringify(this.data.dayTemplate));
        localStorage.setItem('paludario.title', this.data.settings.title);
        localStorage.setItem('paludario.liters', this.data.settings.liters);
        localStorage.setItem('paludario.darkMode', this.data.settings.darkMode);
    }

    updateStatus(message, type = 'success') {
        const statusEl = document.getElementById('status-indicator');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-indicator ${type}`;
            
            if (type === 'success') {
                setTimeout(() => {
                    statusEl.style.opacity = '0.7';
                }, 2000);
            }
        }
        
        // Aggiorna anche l'indicatore dell'ultima sincronizzazione
        this.updateLastSync();
    }
    
    updateLastSync() {
        const lastSyncEl = document.getElementById('last-sync');
        if (lastSyncEl && this.lastSync) {
            const timeStr = this.lastSync.toLocaleString();
            lastSyncEl.textContent = `Ultima sincronizzazione: ${timeStr}`;
        }
    }

    initializeUI() {
        // Inizializza titolo
        const mainTitle = document.getElementById('main-title');
        if (mainTitle) {
            mainTitle.textContent = this.data.settings.title;
        }

        // Inizializza litri
        const litersInput = document.getElementById('liters');
        if (litersInput) {
            litersInput.value = this.data.settings.liters;
        }

        // Inizializza dark mode
        if (this.data.settings.darkMode) {
            document.body.classList.add('dark-mode');
            const darkModeToggle = document.getElementById('dark-mode-toggle');
            if (darkModeToggle) {
                darkModeToggle.textContent = '☀️ Light Mode';
                darkModeToggle.style.background = '#555';
            }
        }

        // Aggiorna UI
        if (typeof renderWaterTable === 'function') renderWaterTable();
        if (typeof renderDayTables === 'function') renderDayTables();
        if (typeof drawWaterChart === 'function') drawWaterChart();
        if (typeof drawDayChart === 'function') drawDayChart();
    }

    // Metodi per aggiornare i dati
    updateWater(waterData) {
        console.log('💾 DataManager.updateWater - INIZIO');
        console.log('📊 waterData ricevuto:', waterData.length, waterData);
        console.log('📊 this.data.water prima:', this.data.water.length, this.data.water);
        
        this.data.water = [...waterData]; // Crea una copia per evitare riferimenti
        
        console.log('📊 this.data.water dopo:', this.data.water.length, this.data.water);
        console.log('📊 water globale prima sincronizzazione:', water.length, water);
        
        // NON sincronizzare l'array globale qui per evitare conflitti
        // L'array globale è già aggiornato dalla funzione addWaterValue
        console.log('📊 Mantenendo array globale invariato per evitare conflitti');
        
        this.saveData();
        console.log('💾 DataManager.updateWater - FINE');
    }

    updateDayTemplate(dayData) {
        this.data.dayTemplate = dayData;
        this.saveData();
    }

    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.saveData();
    }

    // Metodo per aggiornare i dati globali
    updateGlobalData() {
        if (typeof water !== 'undefined') {
            water.length = 0;
            water.push(...(this.data.water || []));
        }
        if (typeof plan !== 'undefined') {
            plan.spray = this.data.dayTemplate?.spray || [];
            plan.fan = this.data.dayTemplate?.fan || [];
            plan.lights = this.data.dayTemplate?.lights || [];
        }
        if (typeof darkMode !== 'undefined') {
            darkMode = this.data.settings?.darkMode || false;
        }
    }
}

// Variabili globali
let water = [];
let plan = { spray: [], fan: [], lights: [] };
let darkMode = false;

// Istanza globale del data manager
const dataManager = new DataManager();
