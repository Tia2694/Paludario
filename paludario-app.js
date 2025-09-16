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
                    // Valida e correggi l'emoji se presente
                    if (settingsData.icon) {
                        settingsData.icon = this.validateAndFixEmoji(settingsData.icon);
                    }
                    this.data.settings = { ...this.data.settings, ...settingsData };
                    updated = true;
                }
                
                // Aggiorna anche l'array globale se abbiamo dati da GitHub
                if (updated) {
                    this.updateGlobalData();
                }
                
                this.lastSync = new Date();
                this.updateStatus('✅ Dati sincronizzati da GitHub', 'success');
                
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
            
            // Valida e correggi l'emoji prima di salvare
            if (this.data.settings.icon) {
                this.data.settings.icon = this.validateAndFixEmoji(this.data.settings.icon);
            }
            
            // Poi prova a salvare su GitHub
            try {
                await Promise.all([
                    this.saveToGitHub(DATA_FILES.water, this.data.water),
                    this.saveToGitHub(DATA_FILES.dayTemplate, this.data.dayTemplate),
                    this.saveToGitHub(DATA_FILES.settings, this.data.settings)
                ]);
                
                this.lastSync = new Date();
                this.updateStatus('✅ Dati salvati su GitHub', 'success');
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
                // Decodifica sicura per caratteri Unicode (incluso emoji)
                const binaryString = atob(data.content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const decoder = new TextDecoder();
                const jsonString = decoder.decode(bytes);
                return JSON.parse(jsonString);
            } else {
                return defaultValue;
            }
        } catch (error) {
            console.error(`Errore nel fetch di ${filePath}:`, error);
            return defaultValue;
        }
    }

    async saveToGitHub(filePath, data, retryCount = 0) {
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
                } else {
                }
            } catch (e) {
            }

            // Codifica sicura per caratteri Unicode (incluso emoji)
            const jsonString = JSON.stringify(data, null, 2);
            // Usa TextEncoder per una codifica UTF-8 corretta
            const encoder = new TextEncoder();
            const utf8Bytes = encoder.encode(jsonString);
            const binaryString = Array.from(utf8Bytes).map(byte => String.fromCharCode(byte)).join('');
            const content = btoa(binaryString);
            
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
                
                // Gestisci errore 409 (Conflict) con retry
                if (response.status === 409 && retryCount < 2) {
                    console.warn(`Conflitto 409 per ${filePath}, retry ${retryCount + 1}/2. SHA attuale: ${errorData.message}`);
                    
                    // Aspetta un po' prima del retry
                    await new Promise(resolve => setTimeout(resolve, 1000 + (retryCount * 500)));
                    
                    // Ricarica i dati da GitHub per ottenere la versione più recente
                    try {
                        const latestResponse = await fetch(`${API_BASE}/contents/${filePath}`, {
                            headers: {
                                'Authorization': `token ${GITHUB_CONFIG.token}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        
                        if (latestResponse.ok) {
                            const latestFileData = await latestResponse.json();
                            
                            // Prova di nuovo con i dati aggiornati
                            return await this.saveToGitHub(filePath, data, retryCount + 1);
                        }
                    } catch (fetchError) {
                        console.error(`Errore nel fetch della versione più recente di ${filePath}:`, fetchError);
                    }
                }
                
                throw new Error(`Errore ${response.status}: ${errorData.message || response.statusText}`);
            }
            
        } catch (error) {
            console.error(`Errore nel salvataggio di ${filePath}:`, error);
            throw error;
        }
    }

    validateAndFixEmoji(emojiText) {
        if (!emojiText || typeof emojiText !== 'string') {
            return '🌱';
        }
        
        // Regex per emoji valide
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F018}-\u{1F0F5}]|[\u{1F200}-\u{1F2FF}]/u;
        
        // Cerca la prima emoji valida
        const matches = emojiText.match(emojiRegex);
        if (matches && matches.length > 0) {
            return matches[0];
        }
        
        // Se non trova emoji valide, controlla se è un carattere corrotto
        if (emojiText.includes('?') || emojiText.includes('') || emojiText.length === 0) {
            return '🌱';
        }
        
        // Se il testo non è vuoto ma non è un'emoji valida, mantieni il default
        return '🌱';
    }

    loadFromLocalStorage() {
        this.data.water = JSON.parse(localStorage.getItem('paludario.waterReadings') || '[]');
        this.data.dayTemplate = JSON.parse(localStorage.getItem('paludario.dayPlanTemplate') || '{"spray":[],"fan":[],"lights":[],"ch1":[],"ch2":[],"ch3":[],"ch4":[],"ch5":[]}');
        
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
            icon: this.validateAndFixEmoji(localStorage.getItem('paludario.icon')) || '🌱',
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
            const iconText = this.data.settings.icon || '🌱';
            const validIcon = this.validateAndFixEmoji(iconText);
            mainIcon.textContent = validIcon;
            // Aggiorna anche i dati se l'icona è stata corretta
            if (validIcon !== iconText) {
                this.data.settings.icon = validIcon;
            }
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
            litersInput.value = this.data.settings.liters;
        } else {
            console.error('Campo liters non trovato nel DOM');
        }

        // Inizializza dark mode
        if (this.data.settings.darkMode) {
            document.body.classList.add('dark-mode');
            const darkModeToggle = document.getElementById('dark-mode-toggle');
            if (darkModeToggle) {
                darkModeToggle.textContent = '☀️ Light';
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
            // Aggiorna la colorazione dei delta dopo aver caricato i dati
            setTimeout(() => {
                if (typeof updateAirThresholdStyling === 'function') {
                    updateAirThresholdStyling();
                }
            }, 100);
        }

        // Aggiorna UI
        if (typeof renderWaterTable === 'function') renderWaterTable();
        if (typeof renderDayTables === 'function') renderDayTables();
        if (typeof drawWaterChart === 'function') drawWaterChart();
        if (typeof drawDayChart === 'function') drawDayChart();
        if (typeof drawAirChart === 'function') drawAirChart();
    }

    // Metodi per aggiornare i dati
    updateWater(waterData) {
        
        this.data.water = [...waterData]; // Crea una copia per evitare riferimenti
        
        
        // NON sincronizzare l'array globale qui per evitare conflitti
        // L'array globale è già aggiornato dalla funzione addWaterValue
        
        this.saveData();
    }

    updateDayTemplate(dayData) {
        // Converte la nuova struttura in quella compatibile con il file JSON
        this.data.dayTemplate = {
            spray: dayData.spray || [],
            fan: dayData.fan || [],
            ch1: dayData.ch1 || [],
            ch2: dayData.ch2 || [],
            ch3: dayData.ch3 || [],
            ch4: dayData.ch4 || [],
            ch5: dayData.ch5 || []
        };
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
            // Migra i dati vecchi se necessario
            if (this.data.dayTemplate?.lights && this.data.dayTemplate.lights.length > 0) {
                // Migra dalla struttura vecchia a quella nuova
                plan.ch1 = [];
                plan.ch2 = [];
                plan.ch3 = [];
                plan.ch4 = [];
                plan.ch5 = [];
                
                this.data.dayTemplate.lights.forEach(light => {
                    if (light.ch1 !== undefined && light.ch1 !== null) {
                        plan.ch1.push({ t: light.t, value: light.ch1 });
                    }
                    if (light.ch2 !== undefined && light.ch2 !== null) {
                        plan.ch2.push({ t: light.t, value: light.ch2 });
                    }
                    if (light.ch3 !== undefined && light.ch3 !== null) {
                        plan.ch3.push({ t: light.t, value: light.ch3 });
                    }
                    if (light.ch4 !== undefined && light.ch4 !== null) {
                        plan.ch4.push({ t: light.t, value: light.ch4 });
                    }
                    if (light.ch5 !== undefined && light.ch5 !== null) {
                        plan.ch5.push({ t: light.t, value: light.ch5 });
                    }
                });
            } else {
                // Usa la nuova struttura
                plan.ch1 = this.data.dayTemplate?.ch1 || [];
                plan.ch2 = this.data.dayTemplate?.ch2 || [];
                plan.ch3 = this.data.dayTemplate?.ch3 || [];
                plan.ch4 = this.data.dayTemplate?.ch4 || [];
                plan.ch5 = this.data.dayTemplate?.ch5 || [];
            }
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
        
        this.autoSyncInterval = setInterval(() => {
            this.checkForUpdates();
        }, 30000); // Controlla ogni 30 secondi
    }

    // Ferma la sincronizzazione automatica
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
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
                if (typeof drawAirChart === 'function') drawAirChart();
                
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
        
        // Converte la stringa Unicode in base64 in modo sicuro
        try {
            // Metodo sicuro per stringhe Unicode (evita spread operator per array grandi)
            const utf8Bytes = new TextEncoder().encode(dataString);
            let binaryString = '';
            for (let i = 0; i < utf8Bytes.length; i++) {
                binaryString += String.fromCharCode(utf8Bytes[i]);
            }
            const base64String = btoa(binaryString);
            return base64String.slice(0, 16); // Hash semplice
        } catch (error) {
            console.error('Errore nel calcolo hash:', error);
            // Fallback: usa solo caratteri ASCII
            const asciiString = dataString.replace(/[^\x00-\x7F]/g, '?');
            return btoa(asciiString).slice(0, 16);
        }
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
let plan = { 
    spray: [], 
    fan: [], 
    ch1: [], 
    ch2: [], 
    ch3: [], 
    ch4: [], 
    ch5: [] 
};
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
            } else {
            }
        }
        
        // Configura l'UI
        if (typeof setupAppAfterLoad === 'function') {
            setupAppAfterLoad();
        }
        
        // Carica i dati
        await dataManager.loadData();
        
        // Carica i dati delle luci RGB nelle tabelle
        if (typeof loadAllChannelData === 'function') {
            loadAllChannelData();
        }
        
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
