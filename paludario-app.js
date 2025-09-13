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
            settings: { 
                title: '🌱 Paludario', 
                liters: '', 
                darkMode: false,
                mobileMode: false,
                waterThresholds: {
                    ph: { min: 6.0, max: 8.0 },
                    kh: { min: 2.0, max: 15.0 },
                    gh: { min: 3.0, max: 20.0 },
                    no2: { min: 0.0, max: 0.5 },
                    no3: { min: 0.0, max: 50.0 },
                    nh4: { min: 0.0, max: 0.5 },
                    temp: { min: 20.0, max: 30.0 },
                    cond: { min: 100, max: 1000 }
                }
            }
        };
        this.syncInProgress = false;
        this.lastSync = null;
        this.autoSyncInterval = null;
        this.lastDataHash = null;
        this.isInitialized = false;
    }

    async loadData() {
        try {
            this.updateStatus('🔄 Caricamento dati...', 'syncing');
            
            // Verifica se GitHub è configurato
            if (!GITHUB_CONFIG.token) {
                console.log('GitHub non configurato, carico solo dati locali');
                this.loadFromLocalStorage();
                this.initializeUI();
                this.updateStatus('✅ Dati locali (GitHub non configurato)', 'success');
                return;
            }
            
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
                // Carica sempre i settings da GitHub se disponibili (anche se title è vuoto)
                if (settingsData && typeof settingsData === 'object') {
                    console.log('Settings caricati da GitHub:', settingsData);
                    this.data.settings = { ...this.data.settings, ...settingsData };
                    updated = true;
                }
                
                // Aggiorna anche l'array globale se abbiamo dati da GitHub
                if (updated) {
                    this.updateGlobalData();
                }
                
                this.lastSync = new Date();
                this.updateStatus('✅ Dati sincronizzati da GitHub', 'success');
                console.log('Dati caricati da GitHub');
                
                // Avvia la sincronizzazione automatica se non è già attiva
                if (!this.isInitialized) {
                    this.startAutoSync();
                    this.isInitialized = true;
                }
                
            } catch (githubError) {
                console.warn('Caricamento GitHub fallito, uso dati locali:', githubError);
                this.updateStatus('✅ Dati locali (GitHub non disponibile)', 'success');
            }
            
            // Inizializza UI con i dati finali (GitHub o locali)
            this.initializeUI();
            
            // Emetti evento per notificare che i dati sono stati caricati
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('dataUpdated', { 
                    detail: { type: 'loadData', source: 'github' } 
                }));
            }
            
        } catch (error) {
            console.error('Errore nel caricamento dati:', error);
            this.updateStatus('❌ Errore caricamento', 'error');
            // Fallback ai dati locali
            this.loadFromLocalStorage();
            this.initializeUI();
            
            // Emetti evento anche in caso di errore (dati locali)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('dataUpdated', { 
                    detail: { type: 'loadData', source: 'local' } 
                }));
            }
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
        
        const savedThresholds = localStorage.getItem('paludario.waterThresholds');
        const defaultThresholds = {
            ph: { min: 6.0, max: 8.0 },
            kh: { min: 2.0, max: 15.0 },
            gh: { min: 3.0, max: 20.0 },
            no2: { min: 0.0, max: 0.5 },
            no3: { min: 0.0, max: 50.0 },
            nh4: { min: 0.0, max: 0.5 },
            temp: { min: 20.0, max: 30.0 },
            cond: { min: 100, max: 1000 }
        };
        
        this.data.settings = {
            title: localStorage.getItem('paludario.title') || '🌱 Paludario',
            subtitle: localStorage.getItem('paludario.subtitle') || 'Sistema di monitoraggio e controllo ambientale',
            icon: localStorage.getItem('paludario.icon') || '🌱',
            liters: localStorage.getItem('paludario.liters') || '',
            darkMode: localStorage.getItem('paludario.darkMode') === 'true',
            mobileMode: localStorage.getItem('paludario.mobileMode') === 'true',
            lockedMode: localStorage.getItem('paludario.lockedMode') === 'true',
            waterThresholds: savedThresholds ? JSON.parse(savedThresholds) : defaultThresholds,
            animals: JSON.parse(localStorage.getItem('paludario.animals') || '[]'),
            airReadings: JSON.parse(localStorage.getItem('paludario.airReadings') || '[]')
        };
        // Aggiorna i dati globali
        this.updateGlobalData();
    }

    saveToLocalStorage() {
        localStorage.setItem('paludario.waterReadings', JSON.stringify(this.data.water));
        localStorage.setItem('paludario.dayPlanTemplate', JSON.stringify(this.data.dayTemplate));
        localStorage.setItem('paludario.title', this.data.settings.title);
        localStorage.setItem('paludario.subtitle', this.data.settings.subtitle || 'Sistema di monitoraggio e controllo ambientale');
        localStorage.setItem('paludario.icon', this.data.settings.icon || '🌱');
        localStorage.setItem('paludario.liters', this.data.settings.liters);
        localStorage.setItem('paludario.darkMode', this.data.settings.darkMode);
        localStorage.setItem('paludario.mobileMode', this.data.settings.mobileMode);
        localStorage.setItem('paludario.lockedMode', this.data.settings.lockedMode);
        localStorage.setItem('paludario.waterThresholds', JSON.stringify(this.data.settings.waterThresholds));
        localStorage.setItem('paludario.animals', JSON.stringify(this.data.settings.animals || []));
        localStorage.setItem('paludario.airReadings', JSON.stringify(this.data.settings.airReadings || []));
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
        console.log('initializeUI chiamata, settings:', this.data.settings);
        
        // Inizializza titolo
        const mainTitle = document.getElementById('main-title');
        if (mainTitle) {
            mainTitle.textContent = this.data.settings.title;
        }
        
        // Inizializza sottotitolo
        const mainSubtitle = document.getElementById('main-subtitle');
        if (mainSubtitle) {
            mainSubtitle.textContent = this.data.settings.subtitle || 'Sistema di monitoraggio e controllo ambientale';
        }
        
        // Inizializza icona
        const mainIcon = document.getElementById('main-icon');
        if (mainIcon) {
            mainIcon.textContent = this.data.settings.icon || '🌱';
        }
        
        // Inizializza stato locked
        if (this.data.settings.lockedMode) {
            const lockToggle = document.getElementById('lock-toggle');
            if (lockToggle) {
                lockToggle.click(); // Attiva la modalità locked
            }
        }

        // Inizializza litri
        const litersInput = document.getElementById('liters');
        if (litersInput) {
            console.log('Aggiornando campo litri con valore:', this.data.settings.liters);
            litersInput.value = this.data.settings.liters;
        } else {
            console.error('Campo liters non trovato nel DOM');
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

        // Inizializza mobile mode
        if (this.data.settings.mobileMode) {
            document.body.classList.add('mobile-mode');
            const mobileToggle = document.getElementById('mobile-toggle');
            if (mobileToggle) {
                mobileToggle.textContent = '💻 Desktop';
                mobileToggle.style.background = '#4caf50';
            }
        }

        // Inizializza animali
        if (this.data.settings.animals && typeof animals !== 'undefined') {
            animals = this.data.settings.animals;
            if (typeof renderAnimalsTable === 'function') {
                renderAnimalsTable();
            }
        }
        
        // Inizializza rilevamenti aria
        if (this.data.settings.airReadings && typeof airReadings !== 'undefined') {
            airReadings = this.data.settings.airReadings;
            if (typeof renderAirTable === 'function') {
                renderAirTable();
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
        
        // Emetti evento per notificare che i dati sono stati aggiornati
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
                detail: { type: 'settings', data: settings } 
            }));
        }
    }

    async syncToGitHub() {
        return await this.saveData();
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
            // Applica gli stili per i valori fuori soglia dopo il caricamento
            setTimeout(() => {
                if (typeof updateThresholdStyling === 'function') {
                    updateThresholdStyling();
                }
            }, 100);
        }
        if (typeof waterThresholds !== 'undefined') {
            waterThresholds = this.data.settings?.waterThresholds || waterThresholds;
        }
    }

    // Avvia la sincronizzazione automatica
    startAutoSync() {
        if (this.autoSyncInterval) return; // Già attiva
        
        console.log('🔄 Avvio sincronizzazione automatica ogni 30 secondi');
        this.autoSyncInterval = setInterval(() => {
            this.checkForUpdates();
        }, 30000); // Controlla ogni 30 secondi
    }

    // Ferma la sincronizzazione automatica
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('⏹️ Sincronizzazione automatica fermata');
        }
    }

    // Controlla se ci sono aggiornamenti su GitHub
    async checkForUpdates() {
        if (!GITHUB_CONFIG.token || this.syncInProgress) return;
        
        try {
            // Calcola hash dei dati attuali
            const currentHash = this.calculateDataHash();
            if (currentHash === this.lastDataHash) {
                // Nessun cambiamento locale, controlla GitHub
                await this.syncFromGitHub();
            } else {
                // Ci sono cambiamenti locali, salva su GitHub
                await this.saveData();
                this.lastDataHash = currentHash;
            }
        } catch (error) {
            console.warn('Errore controllo aggiornamenti:', error);
        }
    }

    // Sincronizza solo da GitHub (senza sovrascrivere cambiamenti locali)
    async syncFromGitHub() {
        if (!GITHUB_CONFIG.token || this.syncInProgress) return;
        
        try {
            const [waterData, dayData, settingsData] = await Promise.all([
                this.fetchFromGitHub(DATA_FILES.water, this.data.water),
                this.fetchFromGitHub(DATA_FILES.dayTemplate, this.data.dayTemplate),
                this.fetchFromGitHub(DATA_FILES.settings, this.data.settings)
            ]);

            let hasUpdates = false;
            
            // Controlla se ci sono aggiornamenti
            if (JSON.stringify(waterData) !== JSON.stringify(this.data.water)) {
                this.data.water = waterData;
                hasUpdates = true;
            }
            if (JSON.stringify(dayData) !== JSON.stringify(this.data.dayTemplate)) {
                this.data.dayTemplate = dayData;
                hasUpdates = true;
            }
            if (JSON.stringify(settingsData) !== JSON.stringify(this.data.settings)) {
                this.data.settings = { ...this.data.settings, ...settingsData };
                hasUpdates = true;
            }
            
            if (hasUpdates) {
                this.updateGlobalData();
                this.updateStatus('🔄 Dati aggiornati da GitHub', 'syncing');
                
                // Aggiorna UI
                if (typeof renderWaterTable === 'function') renderWaterTable();
                if (typeof renderDayTables === 'function') renderDayTables();
                if (typeof drawWaterChart === 'function') drawWaterChart();
                if (typeof drawDayChart === 'function') drawDayChart();
                
                setTimeout(() => {
                    this.updateStatus('✅ Sincronizzazione completata', 'success');
                }, 1000);
            }
        } catch (error) {
            console.warn('Errore sincronizzazione da GitHub:', error);
        }
    }

    // Calcola hash dei dati per rilevare cambiamenti
    calculateDataHash() {
        const dataString = JSON.stringify({
            water: this.data.water,
            dayTemplate: this.data.dayTemplate,
            settings: this.data.settings
        });
        return btoa(dataString).slice(0, 16); // Hash semplice
    }

    // Forza sincronizzazione completa
    async forceSync() {
        this.updateStatus('🔄 Sincronizzazione forzata...', 'syncing');
        
        try {
            // Prima salva i dati locali su GitHub
            await this.saveData();
            
            // Poi ricarica da GitHub
            await this.loadData();
            
            this.updateStatus('✅ Sincronizzazione forzata completata', 'success');
        } catch (error) {
            console.error('Errore sincronizzazione forzata:', error);
            this.updateStatus('❌ Errore sincronizzazione', 'error');
        }
    }
}

// Variabili globali
let water = [];
let plan = { spray: [], fan: [], lights: [] };
let darkMode = false;

// Istanza globale del data manager
const dataManager = new DataManager();

// Inizializza GitHub e l'app
async function initializeApp() {
    try {
        // Inizializza GitHub se disponibile
        if (typeof initializeGitHubConfig === 'function') {
            const githubReady = await initializeGitHubConfig();
            if (githubReady) {
                console.log('✅ GitHub configurato correttamente');
            } else {
                console.log('⚠️ GitHub non configurato, funzionerà solo in modalità locale');
            }
        }
        
        // Configura l'UI
        if (typeof setupAppAfterLoad === 'function') {
            setupAppAfterLoad();
        }
        
        // Carica i dati
        await dataManager.loadData();
        
    } catch (error) {
        console.error('Errore inizializzazione app:', error);
    }
}

// Avvia l'app quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
