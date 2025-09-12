/* ==================== CONFIGURAZIONE GITHUB ==================== */
const GITHUB_CONFIG = {
    // Sostituisci con i tuoi dati GitHub
    username: 'Tia2694',
    repository: 'Paludario',
    branch: 'main',
    token: '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' // Sostituisci con il nuovo token
};

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
            
            // Carica dati da GitHub
            const [waterData, dayData, settingsData] = await Promise.all([
                this.fetchFromGitHub(DATA_FILES.water, []),
                this.fetchFromGitHub(DATA_FILES.dayTemplate, { spray: [], fan: [], lights: [] }),
                this.fetchFromGitHub(DATA_FILES.settings, { title: '🌱 Paludario', liters: '', darkMode: false })
            ]);

            this.data.water = waterData;
            this.data.dayTemplate = dayData;
            this.data.settings = settingsData;
            
            this.lastSync = new Date();
            this.updateStatus('✅ Dati caricati', 'success');
            
            // Inizializza UI
            this.initializeUI();
            
        } catch (error) {
            console.error('Errore nel caricamento dati:', error);
            this.updateStatus('❌ Errore caricamento', 'error');
            // Fallback ai dati locali
            this.loadFromLocalStorage();
        }
    }

    async saveData() {
        if (this.syncInProgress) return;
        
        try {
            this.syncInProgress = true;
            this.updateStatus('🔄 Salvataggio...', 'syncing');
            
            // Salva su GitHub
            await Promise.all([
                this.saveToGitHub(DATA_FILES.water, this.data.water),
                this.saveToGitHub(DATA_FILES.dayTemplate, this.data.dayTemplate),
                this.saveToGitHub(DATA_FILES.settings, this.data.settings)
            ]);
            
            this.lastSync = new Date();
            this.updateStatus('✅ Dati salvati', 'success');
            
            // Salva anche localmente come backup
            this.saveToLocalStorage();
            
        } catch (error) {
            console.error('Errore nel salvataggio:', error);
            this.updateStatus('❌ Errore salvataggio', 'error');
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
                }
            } catch (e) {
                // File non esiste, SHA rimane null
                console.log(`File ${filePath} non esiste, creazione nuovo file`);
            }

            // Codifica sicura per caratteri Unicode
            const jsonString = JSON.stringify(data, null, 2);
            const content = btoa(unescape(encodeURIComponent(jsonString)));
            
            const response = await fetch(`${API_BASE}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Aggiorna ${filePath} - ${new Date().toISOString()}`,
                    content: content,
                    sha: sha,
                    branch: GITHUB_CONFIG.branch
                })
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
        this.initializeUI();
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
        this.data.water = waterData;
        this.saveData();
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
