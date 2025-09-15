/* ==================== UTILITÀ ==================== */
function fmtDateTimeLocal(dtStr) { 
    const d = new Date(dtStr); 
    return isNaN(d) ? (dtStr || '') : d.toLocaleString(); 
}

function toMinutes(hhmm) { 
    if (!hhmm) return null; 
    const [h, m] = hhmm.split(':').map(Number); 
    return h * 60 + m; 
}

function numOrNull(v) { 
    if (v === null || v === '') return null; 
    const n = Number(v); 
    return isFinite(n) ? n : null; 
}

const COLORS = { 
    R: '#e53935', G: '#43a047', B: '#1e88e5', W: '#757575', 
    Plaf: '#ff9800', Spray: '#009688', Ventola: '#795548', Axis: '#888' 
};

/* ==================== VARIABILI GLOBALI ==================== */
let showBackgrounds = true;
let showFill = true;

// Soglie per i parametri dell'acqua
let waterThresholds = {
    ph: { min: 6.0, max: 8.0 },
    kh: { min: 2.0, max: 15.0 },
    gh: { min: 3.0, max: 20.0 },
    no2: { min: 0.0, max: 0.5 },
    no3: { min: 0.0, max: 50.0 },
    nh4: { min: 0.0, max: 0.5 },
    temp: { min: 20.0, max: 30.0 },
    cond: { min: 100, max: 1000 }
};

/* ==================== UI HOOKS ==================== */
const waterDt = document.getElementById('water-dt');
const ph = document.getElementById('ph');
const kh = document.getElementById('kh');
const gh = document.getElementById('gh');
const no2 = document.getElementById('no2');
const no3 = document.getElementById('no3');
const nh4 = document.getElementById('nh4');
const temp = document.getElementById('temp');
const cond = document.getElementById('cond');
const addWaterBtn = document.getElementById('add-water');
const clearWaterBtn = document.getElementById('clear-water');
let waterTableBody;
const paramSelect = document.getElementById('param-select');
const refreshWaterChartBtn = document.getElementById('refresh-water-chart');
const waterCanvas = document.getElementById('waterChart');

const sprayStart = document.getElementById('spray-start');
const sprayEnd = document.getElementById('spray-end');
const addSprayBtn = document.getElementById('add-spray');
const clearSprayBtn = document.getElementById('clear-spray');
let sprayTableBody;

const fanStart = document.getElementById('fan-start');
const fanEnd = document.getElementById('fan-end');
const addFanBtn = document.getElementById('add-fan');
const clearFanBtn = document.getElementById('clear-fan');
let fanTableBody;

// Riferimenti alle nuove tabelle canali
const channelTables = {
    ch1: document.getElementById('ch1-table'),
    ch2: document.getElementById('ch2-table'),
    ch3: document.getElementById('ch3-table'),
    ch4: document.getElementById('ch4-table'),
    ch5: document.getElementById('ch5-table')
};

// Riferimenti ai pulsanti aggiungi riga
const addRowBtns = document.querySelectorAll('.add-row-btn');

const refreshDayChartBtn = document.getElementById('refresh-day-chart');
const toggleBackgroundsBtn = document.getElementById('toggle-backgrounds');
const toggleFillBtn = document.getElementById('toggle-fill');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const dayCanvas = document.getElementById('dayChart');
const dayLegend = document.getElementById('dayLegend');
const mainTitle = document.getElementById('main-title');
const litersInput = document.getElementById('liters');
const syncDataBtn = document.getElementById('sync-data');
const debugSyncBtn = document.getElementById('debug-sync');

// Elementi per le soglie
const waterSettingsBtn = document.getElementById('water-settings-btn');
const waterSettingsModal = document.getElementById('water-settings-modal');
const closeSettingsModal = document.getElementById('close-settings-modal');
const thresholdSettings = document.getElementById('threshold-settings');
const resetThresholdsBtn = document.getElementById('reset-thresholds');
const saveThresholdsBtn = document.getElementById('save-thresholds');

/* ==================== INIZIALIZZAZIONE ==================== */
function setupAppAfterLoad() {
    // Imposta data/ora corrente
    if (waterDt) {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        waterDt.value = d.toISOString().slice(0, 16);
    }

    // Event listeners
    setupEventListeners();
    
    // Carica le soglie dell'acqua
    loadWaterThresholds();
}

function setupEventListeners() {
    // Inizializza i selettori DOM
    waterTableBody = document.querySelector('#water-table tbody');
    sprayTableBody = document.querySelector('#spray-table tbody');
    fanTableBody = document.querySelector('#fan-table tbody');
    lightTableBody = document.querySelector('#light-table tbody');
    
    // Titolo editabile
    if (mainTitle) {
        mainTitle.addEventListener('blur', () => {
            if (dataManager && dataManager.updateSettings) {
                dataManager.updateSettings({ title: mainTitle.textContent });
            } else {
                console.error('DataManager non disponibile per salvare il titolo');
            }
        });
        mainTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mainTitle.blur();
            }
        });
    }
    
    // Sottotitolo editabile
    const mainSubtitle = document.getElementById('main-subtitle');
    if (mainSubtitle) {
        mainSubtitle.addEventListener('blur', () => {
            if (dataManager && dataManager.updateSettings) {
                dataManager.updateSettings({ subtitle: mainSubtitle.textContent });
            } else {
                console.error('DataManager non disponibile per salvare il sottotitolo');
            }
        });
        mainSubtitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mainSubtitle.blur();
            }
        });
    }
    
    // Icona editabile (solo emoji singole)
    const mainIcon = document.getElementById('main-icon');
    if (mainIcon) {
        mainIcon.addEventListener('blur', () => {
            if (dataManager && dataManager.updateSettings) {
                dataManager.updateSettings({ icon: mainIcon.textContent });
            } else {
                console.error('DataManager non disponibile per salvare l\'icona');
            }
        });
        
        mainIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mainIcon.blur();
            }
        });
        
        // Filtra solo emoji singole durante l'input
        mainIcon.addEventListener('input', (e) => {
            let content = e.target.textContent;
            
            // Rimuovi tutto tranne il primo carattere emoji
            const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F018}-\u{1F0F5}]|[\u{1F200}-\u{1F2FF}]/u;
            const matches = content.match(emojiRegex);
            
            if (matches && matches.length > 0) {
                // Mantieni solo la prima emoji
                e.target.textContent = matches[0];
            } else if (content.length > 0) {
                // Se non è un'emoji valida, ripristina l'icona precedente
                e.target.textContent = dataManager?.data?.settings?.icon || '🌱';
            }
        });
        
        // Previeni l'incollaggio di testo non emoji
        mainIcon.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F018}-\u{1F0F5}]|[\u{1F200}-\u{1F2FF}]/u;
            const matches = paste.match(emojiRegex);
            
            if (matches && matches.length > 0) {
                mainIcon.textContent = matches[0];
            }
        });
    }

    // Litri
    if (litersInput) {
        litersInput.addEventListener('input', () => {
            if (litersInput.value !== '' && Number(litersInput.value) < 0) {
                litersInput.value = 0;
            }
            // Aggiorna i dati globali
            if (dataManager && dataManager.updateSettings) {
                dataManager.updateSettings({ liters: litersInput.value });
            } else {
                console.error('DataManager non disponibile per salvare i litri');
            }
        });
        
        litersInput.addEventListener('blur', () => {
            if (dataManager && dataManager.updateSettings) {
                dataManager.updateSettings({ liters: litersInput.value });
            } else {
                console.error('DataManager non disponibile per salvare i litri');
            }
        });
    }

    // Valori acqua
    if (addWaterBtn) {
        addWaterBtn.onclick = addWaterValue;
    }
    if (clearWaterBtn) {
        clearWaterBtn.onclick = clearWaterInputs;
    }

    // Spray
    if (addSprayBtn) {
        addSprayBtn.onclick = addSprayInterval;
    }
    if (clearSprayBtn) {
        clearSprayBtn.onclick = clearSprayInputs;
    }

    // Ventola
    if (addFanBtn) {
        addFanBtn.onclick = addFanInterval;
    }
    if (clearFanBtn) {
        clearFanBtn.onclick = clearFanInputs;
    }

    // Luci - nuove tabelle separate
    addRowBtns.forEach(btn => {
        btn.onclick = () => addChannelRow(btn.dataset.channel);
    });

    // Animali
    if (addAnimalBtn) {
        addAnimalBtn.onclick = addAnimal;
    }
    if (clearAnimalBtn) {
        clearAnimalBtn.onclick = clearAnimalForm;
    }

    // Grafici
    if (refreshWaterChartBtn) {
        refreshWaterChartBtn.onclick = () => drawWaterChart();
    }
    if (refreshDayChartBtn) {
        refreshDayChartBtn.onclick = () => drawDayChart();
    }

    // Toggle buttons
    if (toggleBackgroundsBtn) {
        toggleBackgroundsBtn.onclick = () => {
            showBackgrounds = !showBackgrounds;
            toggleBackgroundsBtn.textContent = showBackgrounds ? '🎨 Nascondi Sfondo' : '🎨 Mostra Sfondo';
            drawDayChart();
        };
        
        // Imposta il testo iniziale basato sullo stato attuale
        toggleBackgroundsBtn.textContent = showBackgrounds ? '🎨 Nascondi Sfondo' : '🎨 Mostra Sfondo';
    }

    if (toggleFillBtn) {
        toggleFillBtn.onclick = () => {
            showFill = !showFill;
            toggleFillBtn.textContent = showFill ? '📊 Grafico Vuoto' : '📊 Grafico Pieno';
            drawDayChart();
        };
    }

    if (darkModeToggle) {
        darkModeToggle.onclick = () => {
            darkMode = !darkMode;
            document.body.classList.toggle('dark-mode', darkMode);
            darkModeToggle.textContent = darkMode ? '☀️ Light' : '🌙 Dark';
            darkModeToggle.style.background = darkMode ? '#555' : '#333';
            dataManager.updateSettings({ darkMode });
            drawWaterChart();
            drawDayChart();
            // Riapplica gli stili per i valori fuori soglia
            updateThresholdStyling();
        };
    }

    // Toggle modalità mobile
    const mobileToggle = document.getElementById('mobile-toggle');
    if (mobileToggle) {
        // Carica stato mobile dal localStorage
        const isMobileMode = localStorage.getItem('paludario.mobileMode') === 'true';
        if (isMobileMode) {
            document.body.classList.add('mobile-mode');
            mobileToggle.textContent = '💻 Desktop';
            mobileToggle.style.background = '#4caf50';
        }

        mobileToggle.onclick = () => {
            const isCurrentlyMobile = document.body.classList.contains('mobile-mode');
            
            if (isCurrentlyMobile) {
                // Passa a desktop
                document.body.classList.remove('mobile-mode');
                mobileToggle.textContent = '📱 Mobile';
                mobileToggle.style.background = '#9c27b0';
                localStorage.setItem('paludario.mobileMode', 'false');
                
                // Salva nel data manager
                if (dataManager && dataManager.updateSettings) {
                    dataManager.updateSettings({ mobileMode: false });
                }
            } else {
                // Passa a mobile
                document.body.classList.add('mobile-mode');
                mobileToggle.textContent = '💻 Desktop';
                mobileToggle.style.background = '#4caf50';
                localStorage.setItem('paludario.mobileMode', 'true');
                
                // Salva nel data manager
                if (dataManager && dataManager.updateSettings) {
                    dataManager.updateSettings({ mobileMode: true });
                }
            }
            
            // Ridisegna i grafici per adattarsi al nuovo layout
            setTimeout(() => {
                if (typeof drawWaterChart === 'function') drawWaterChart();
                if (typeof drawDayChart === 'function') drawDayChart();
            }, 100);
        };
    }

    if (syncDataBtn) {
        syncDataBtn.onclick = () => {
            if (dataManager && dataManager.forceSync) {
                dataManager.forceSync().then(() => {
                    // Forza l'aggiornamento dell'UI dopo la sincronizzazione
                    updateGlobalData();
                    
                    // Aggiorna specificamente il campo litri
                    if (litersInput && dataManager.data.settings) {
                        litersInput.value = dataManager.data.settings.liters || '';
                    }
                    
                    // Aggiorna il titolo
                    if (mainTitle && dataManager.data.settings) {
                        mainTitle.textContent = dataManager.data.settings.title || '🌱 Paludario';
                    }
                    
                    // Aggiorna il sottotitolo
                    const mainSubtitle = document.getElementById('main-subtitle');
                    if (mainSubtitle && dataManager.data.settings) {
                        mainSubtitle.textContent = dataManager.data.settings.subtitle || 'Sistema di monitoraggio e controllo ambientale';
                    }
                    
                    // Aggiorna l'icona
                    const mainIcon = document.getElementById('main-icon');
                    if (mainIcon && dataManager.data.settings) {
                        mainIcon.textContent = dataManager.data.settings.icon || '🌱';
                    }
                    
                    if (typeof renderWaterTable === 'function') renderWaterTable();
                    if (typeof renderDayTables === 'function') renderDayTables();
                    if (typeof drawWaterChart === 'function') drawWaterChart();
                    if (typeof drawDayChart === 'function') drawDayChart();
                });
            } else {
                // Fallback al metodo precedente
                dataManager.loadData().then(() => {
                    updateGlobalData();
                    
                    if (litersInput && dataManager.data.settings) {
                        litersInput.value = dataManager.data.settings.liters || '';
                    }
                    
                    if (mainTitle && dataManager.data.settings) {
                        mainTitle.textContent = dataManager.data.settings.title || '🌱 Paludario';
                    }
                    
                    // Aggiorna il sottotitolo
                    const mainSubtitle = document.getElementById('main-subtitle');
                    if (mainSubtitle && dataManager.data.settings) {
                        mainSubtitle.textContent = dataManager.data.settings.subtitle || 'Sistema di monitoraggio e controllo ambientale';
                    }
                    
                    // Aggiorna l'icona
                    const mainIcon = document.getElementById('main-icon');
                    if (mainIcon && dataManager.data.settings) {
                        mainIcon.textContent = dataManager.data.settings.icon || '🌱';
                    }
                    
                    if (typeof renderWaterTable === 'function') renderWaterTable();
                    if (typeof renderDayTables === 'function') renderDayTables();
                    if (typeof drawWaterChart === 'function') drawWaterChart();
                    if (typeof drawDayChart === 'function') drawDayChart();
                });
            }
        };
    }

    if (debugSyncBtn) {
        debugSyncBtn.onclick = () => {
            
            // Test connessione GitHub
            if (GITHUB_CONFIG.token && typeof validateGitHubToken === 'function') {
                validateGitHubToken().then(valid => {
                });
            }
            
            // Forza l'aggiornamento dell'UI
            if (litersInput && dataManager.data.settings) {
                litersInput.value = dataManager.data.settings.liters || '';
            }
            if (mainTitle && dataManager.data.settings) {
                mainTitle.textContent = dataManager.data.settings.title || '🌱 Paludario';
            }
            
            // Aggiorna il sottotitolo
            const mainSubtitle = document.getElementById('main-subtitle');
            if (mainSubtitle && dataManager.data.settings) {
                mainSubtitle.textContent = dataManager.data.settings.subtitle || 'Sistema di monitoraggio e controllo ambientale';
            }
            
            // Aggiorna l'icona
            const mainIcon = document.getElementById('main-icon');
            if (mainIcon && dataManager.data.settings) {
                mainIcon.textContent = dataManager.data.settings.icon || '🌱';
            }
        };
    }

    // Event listeners per le soglie
    if (waterSettingsBtn) {
        waterSettingsBtn.onclick = openWaterSettings;
    }
    if (closeSettingsModal) {
        closeSettingsModal.onclick = closeWaterSettings;
    }
    if (saveThresholdsBtn) {
        saveThresholdsBtn.onclick = saveThresholds;
    }
    if (resetThresholdsBtn) {
        resetThresholdsBtn.onclick = resetThresholds;
    }
    
    // Chiudi modal cliccando fuori
    if (waterSettingsModal) {
        waterSettingsModal.onclick = (e) => {
            if (e.target === waterSettingsModal) {
                closeWaterSettings();
            }
        };
    }

    // OK/Clear buttons
    hookOkCancelButtons();

    // Input validation per valori negativi
    [ph, kh, gh, no2, no3, nh4, temp, cond].forEach(inp => {
        if (inp) {
            inp.addEventListener('input', () => {
                if (inp.value !== '') {
                    const n = Number(inp.value);
                    if (isFinite(n) && n < 0) inp.value = 0;
                }
            });
        }
    });

    // Resize handler
    window.addEventListener('resize', () => {
        drawWaterChart();
        drawDayChart();
    });
    
    // Event listeners per animali - rimossi da qui, ora sono in setupEventListeners()
    
    // Validazione campi animali
    if (animalMales && animalFemales && animalCount) {
        [animalMales, animalFemales, animalCount].forEach(input => {
            if (input) {
                input.addEventListener('input', validateAnimalFields);
            }
        });
    }
    
    // Event listeners per aria
    if (clearAirBtn) {
        clearAirBtn.addEventListener('click', clearAirForm);
    }
    
    // Validazione campi aria
    if (airTempMin && airTempMax && airHumidityMin && airHumidityMax) {
        [airTempMin, airTempMax, airHumidityMin, airHumidityMax].forEach(input => {
            if (input) {
                input.addEventListener('input', validateAirFields);
            }
        });
    }
}

/* ==================== VALORI ACQUA ==================== */
function addWaterValue() {
    
    const ts = waterDt.value;
    if (!ts) return alert('Inserisci data/ora');
    
    const rec = {
        id: Math.random().toString(36).slice(2),
        ts,
        ph: nonNeg(ph.value),
        kh: nonNeg(kh.value),
        gh: nonNeg(gh.value),
        no2: nonNeg(no2.value),
        no3: nonNeg(no3.value),
        nh4: nonNeg(nh4.value),
        temp: nonNeg(temp.value),
        cond: nonNeg(cond.value),
    };
    
    
    // Aggiungi il record all'array globale
    water.push(rec);
    
    // Renderizza IMMEDIATAMENTE la tabella e i grafici con i dati aggiornati
    renderWaterTable();
    if (typeof drawWaterChart === 'function') {
        drawWaterChart();
    }
    
    // Poi aggiorna il dataManager con l'array completo (in background)
    if (dataManager && dataManager.updateWater) {
        dataManager.updateWater(water);
    } else {
        console.error('DataManager non disponibile per salvare i valori acqua');
    }
    
    clearWaterInputs();
}

function clearWaterInputs() {
    [ph, kh, gh, no2, no3, nh4, temp, cond].forEach(i => i.value = '');
}

function nonNeg(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    if (!isFinite(n)) return null;
    return Math.max(0, n);
}

// Calcola la variazione percentuale rispetto al valore precedente (non vuoto)
function calculateVariation(sortedData, currentIndex, field) {
    // Se è il primo elemento o il valore corrente è null/vuoto, non c'è variazione
    if (currentIndex === 0 || sortedData[currentIndex][field] === null || sortedData[currentIndex][field] === undefined) {
        return null;
    }
    
    const currentValue = sortedData[currentIndex][field];
    
    // Trova il valore precedente non vuoto
    let previousValue = null;
    for (let i = currentIndex - 1; i >= 0; i--) {
        const value = sortedData[i][field];
        if (value !== null && value !== undefined) {
            previousValue = value;
            break;
        }
    }
    
    // Se non c'è valore precedente, non c'è variazione
    if (previousValue === null || previousValue === undefined) {
        return null;
    }
    
    // Calcola la variazione percentuale
    const variation = ((currentValue - previousValue) / previousValue) * 100;
    
    // Arrotonda a 1 decimale
    return Math.round(variation * 10) / 10;
}

// Determina se la variazione è positiva o negativa per la salute dell'acqua
function getVariationDirection(field, currentValue, previousValue, variation) {
    if (variation === null || variation === 0) return 'neutral';
    
    const threshold = waterThresholds[field];
    if (!threshold) return variation > 0 ? 'positive' : 'negative';
    
    // Calcola se il valore corrente è più vicino o più lontano dalle soglie rispetto al precedente
    const currentDistanceFromMin = Math.abs(currentValue - threshold.min);
    const currentDistanceFromMax = Math.abs(currentValue - threshold.max);
    const currentMinDistance = Math.min(currentDistanceFromMin, currentDistanceFromMax);
    
    const previousDistanceFromMin = Math.abs(previousValue - threshold.min);
    const previousDistanceFromMax = Math.abs(previousValue - threshold.max);
    const previousMinDistance = Math.min(previousDistanceFromMin, previousDistanceFromMax);
    
    // Se il valore corrente è più lontano dalle soglie = buono (verde)
    // Se il valore corrente è più vicino alle soglie = cattivo (rosso)
    if (currentMinDistance > previousMinDistance) {
        return 'positive'; // Migliora: si allontana dalle soglie
    } else if (currentMinDistance < previousMinDistance) {
        return 'negative'; // Peggiora: si avvicina alle soglie
    } else {
        return variation > 0 ? 'positive' : 'negative'; // Fallback al segno della variazione
    }
}

function renderWaterTable() {
    
    if (!waterTableBody) {
        console.error('❌ waterTableBody non trovato!');
        return;
    }
    
    waterTableBody.innerHTML = '';
    
    // Ordinamento cronologico per calcolo variazioni (dal più vecchio al più recente)
    const sortedForCalculation = [...water].sort((a, b) => new Date(a.ts) - new Date(b.ts));
    
    // Ordinamento per visualizzazione (dal più recente al più vecchio)
    const sortedForDisplay = [...water].sort((a, b) => new Date(b.ts) - new Date(a.ts));
    
    
    // Crea un mapping per trovare l'indice cronologico di ogni record
    const chronologicalIndexMap = new Map();
    sortedForCalculation.forEach((record, index) => {
        chronologicalIndexMap.set(record.id, index);
    });
    
    for (let i = 0; i < sortedForDisplay.length; i++) {
        const row = sortedForDisplay[i];
        const tr = document.createElement('tr');
        
        // Trova l'indice cronologico di questo record
        const chronologicalIndex = chronologicalIndexMap.get(row.id);
        
        // Genera le celle con colorazione basata sulle soglie
        const cells = [
            { value: row.ph, field: 'ph', step: '0.5' },
            { value: row.kh, field: 'kh', step: '1' },
            { value: row.gh, field: 'gh', step: '1' },
            { value: row.no2, field: 'no2', step: '0.01' },
            { value: row.no3, field: 'no3', step: '1' },
            { value: row.nh4, field: 'nh4', step: '0.01' },
            { value: row.temp, field: 'temp', step: '0.1' },
            { value: row.cond, field: 'cond', step: '1' }
        ];
        
        let cellsHtml = `<td class="mono">${fmtDateTimeLocal(row.ts)}</td>`;
        
        cells.forEach(cell => {
            const isOutOfThreshold = isValueOutOfThreshold(cell.field, cell.value);
            const style = isOutOfThreshold ? 'background: #ffebee; border-color: #f44336; color: #d32f2f;' : '';
            cellsHtml += `<td><input type="number" step="${cell.step}" min="0" value="${cell.value ?? ''}" data-id="${row.id}" data-field="${cell.field}" class="table-input" style="${style}"></td>`;
            
            // Aggiungi colonna con variazione percentuale usando l'indice cronologico
            const variation = chronologicalIndex !== undefined ? calculateVariation(sortedForCalculation, chronologicalIndex, cell.field) : null;
            if (variation !== null) {
                // Trova il valore precedente per determinare la direzione
                let previousValue = null;
                if (chronologicalIndex > 0) {
                    for (let i = chronologicalIndex - 1; i >= 0; i--) {
                        const value = sortedForCalculation[i][cell.field];
                        if (value !== null && value !== undefined) {
                            previousValue = value;
                            break;
                        }
                    }
                }
                
                // Determina se la variazione è buona o cattiva per la salute dell'acqua
                const direction = previousValue !== null ? getVariationDirection(cell.field, cell.value, previousValue, variation) : 'neutral';
                const cssClass = direction === 'positive' ? 'variation-positive' : direction === 'negative' ? 'variation-negative' : 'variation-neutral';
                const symbol = variation > 0 ? '+' : '';
                cellsHtml += `<td class="variation-column ${cssClass}">${symbol}${variation.toFixed(1)}%</td>`;
            } else {
                cellsHtml += `<td class="variation-column variation-neutral">-</td>`;
            }
        });
        
        cellsHtml += `<td><button data-id="${row.id}" class="del-water">🗑️ Elimina</button></td>`;
        
        tr.innerHTML = cellsHtml;
        waterTableBody.appendChild(tr);
    }
    
    // Event listeners per eliminare
    waterTableBody.querySelectorAll('.del-water').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            water = water.filter(w => w.id !== id);
            if (dataManager && dataManager.updateWater) {
                dataManager.updateWater(water);
            }
            renderWaterTable();
            drawWaterChart();
        };
    });
    
    // Event listeners per modificare
    waterTableBody.querySelectorAll('.table-input').forEach(input => {
        input.addEventListener('change', () => {
            const id = input.getAttribute('data-id');
            const field = input.getAttribute('data-field');
            const value = input.value === '' ? null : Number(input.value);
            
            const row = water.find(w => w.id === id);
            if (row) {
                row[field] = value;
                if (dataManager && dataManager.updateWater) {
                    dataManager.updateWater(water);
                }
                drawWaterChart();
                
                // RICARICA LA TABELLA per aggiornare i delta
                renderWaterTable();
            }
            
            // Aggiorna la colorazione della casella in base alle soglie
            const isOutOfThreshold = isValueOutOfThreshold(field, value);
            if (isOutOfThreshold) {
                input.style.background = '#ffebee';
                input.style.borderColor = '#f44336';
                input.style.color = '#d32f2f';
            } else {
                input.style.background = '';
                input.style.borderColor = '';
                input.style.color = '';
            }
        });
    });
}

/* ==================== GESTIONE ANIMALI ==================== */

// Array per memorizzare gli animali
let animals = [];

// Elementi del form animali
const animalSpecies = document.getElementById('animal-species');
const animalType = document.getElementById('animal-type');
const animalCount = document.getElementById('animal-count');
const animalMales = document.getElementById('animal-males');
const animalFemales = document.getElementById('animal-females');
const animalPurchaseDate = document.getElementById('animal-purchase-date');
const animalStatus = document.getElementById('animal-status');
const addAnimalBtn = document.getElementById('add-animal');
const clearAnimalBtn = document.getElementById('clear-animal');
const animalsTable = document.getElementById('animals-table');

// Funzione per aggiungere un animale
function addAnimal() {
    if (!animalSpecies.value.trim()) {
        alert('Inserisci la specie/razza');
        return;
    }
    
    const males = parseInt(animalMales.value) || 0;
    const females = parseInt(animalFemales.value) || 0;
    const total = parseInt(animalCount.value) || 1;
    
    if (males + females > total) {
        alert('La somma di maschi e femmine non può superare il totale degli esemplari');
        return;
    }
    
    const animal = {
        id: Date.now(),
        species: animalSpecies.value.trim(),
        type: animalType.value,
        count: total,
        males: males,
        females: females,
        purchaseDate: animalPurchaseDate.value || new Date().toISOString().split('T')[0],
        status: animalStatus.value
    };
    
    animals.push(animal);
    renderAnimalsTable();
    clearAnimalForm();
    
    // Salva nel localStorage
    if (dataManager) {
        dataManager.updateSettings({ animals });
    }
}

// Funzione per pulire il form animali
function clearAnimalForm() {
    animalSpecies.value = '';
    animalType.value = 'pesce';
    animalCount.value = '1';
    animalMales.value = '0';
    animalFemales.value = '0';
    animalPurchaseDate.value = '';
    animalStatus.value = 'vivo';
}

// Funzione per rimuovere un animale
function removeAnimal(id) {
    if (confirm('Sei sicuro di voler rimuovere questo animale?')) {
        animals = animals.filter(animal => animal.id !== id);
        renderAnimalsTable();
        
        // Salva nel localStorage
        if (dataManager) {
            dataManager.updateSettings({ animals });
        }
    }
}

// Funzione per aggiornare lo stato di un animale
function updateAnimalStatus(id, newStatus) {
    const animal = animals.find(a => a.id === id);
    if (animal) {
        animal.status = newStatus;
        renderAnimalsTable();
        
        // Salva nel localStorage
        if (dataManager) {
            dataManager.updateSettings({ animals });
        }
    }
}

// Funzione per rendere la tabella animali
function renderAnimalsTable() {
    if (!animalsTable) return;
    
    const tbody = animalsTable.querySelector('tbody');
    if (!tbody) return;
    
    if (animals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666; padding: 20px;">Nessun animale registrato</td></tr>';
        return;
    }
    
    tbody.innerHTML = animals.map(animal => {
        const statusOptions = {
            'vivo': '🟢 Vivo',
            'morto': '🔴 Morto',
            'malato': '🟡 Malato',
            'gravida': '🟣 Gravidanza'
        };
        
        const typeOptions = {
            'pesce': '🐟 Pesce',
            'mollusco': '🐚 Mollusco',
            'crostaceo': '🦐 Crostaceo'
        };
        
        return `
            <tr>
                <td><strong>${animal.species}</strong></td>
                <td>${typeOptions[animal.type] || '🐟 Pesce'}</td>
                <td>${animal.count}</td>
                <td>${animal.males}</td>
                <td>${animal.females}</td>
                <td>${animal.purchaseDate}</td>
                <td>
                    <select onchange="updateAnimalStatus(${animal.id}, this.value)" style="background: transparent; border: none; color: inherit; font-size: inherit;">
                        <option value="vivo" ${animal.status === 'vivo' ? 'selected' : ''}>🟢 Vivo</option>
                        <option value="morto" ${animal.status === 'morto' ? 'selected' : ''}>🔴 Morto</option>
                        <option value="malato" ${animal.status === 'malato' ? 'selected' : ''}>🟡 Malato</option>
                        <option value="gravida" ${animal.status === 'gravida' ? 'selected' : ''}>🟣 Gravidanza</option>
                    </select>
                </td>
                <td>
                    <button onclick="removeAnimal(${animal.id})" style="background: #f44336; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Funzione per validare i campi animali
function validateAnimalFields() {
    const males = parseInt(animalMales.value) || 0;
    const females = parseInt(animalFemales.value) || 0;
    const total = parseInt(animalCount.value) || 1;
    
    if (males + females > total) {
        animalMales.style.borderColor = '#f44336';
        animalFemales.style.borderColor = '#f44336';
        animalCount.style.borderColor = '#f44336';
    } else {
        animalMales.style.borderColor = '';
        animalFemales.style.borderColor = '';
        animalCount.style.borderColor = '';
    }
}

/* ==================== GESTIONE ARIA ==================== */

// Array per memorizzare i rilevamenti aria
let airReadings = [];

// Elementi del form aria
const airDatetime = document.getElementById('air-datetime');
const airTempMin = document.getElementById('air-temp-min');
const airTempMax = document.getElementById('air-temp-max');
const airHumidityMin = document.getElementById('air-humidity-min');
const airHumidityMax = document.getElementById('air-humidity-max');
const clearAirBtn = document.getElementById('clear-air');
const airTable = document.getElementById('air-table');

// Funzione per aggiungere un rilevamento aria
function addAirReading() {
    if (!airDatetime.value) {
        alert('Inserisci data e ora');
        return;
    }
    
    const tempMin = parseFloat(airTempMin.value);
    const tempMax = parseFloat(airTempMax.value);
    const humidityMin = parseFloat(airHumidityMin.value);
    const humidityMax = parseFloat(airHumidityMax.value);
    
    if (isNaN(tempMin) || isNaN(tempMax) || isNaN(humidityMin) || isNaN(humidityMax)) {
        alert('Inserisci tutti i valori numerici');
        return;
    }
    
    if (tempMin > tempMax) {
        alert('La temperatura minima non può essere maggiore della massima');
        return;
    }
    
    if (humidityMin > humidityMax) {
        alert('L\'umidità minima non può essere maggiore della massima');
        return;
    }
    
    const airReading = {
        id: Date.now(),
        datetime: airDatetime.value,
        tempMin: tempMin,
        tempMax: tempMax,
        humidityMin: humidityMin,
        humidityMax: humidityMax
    };
    
    airReadings.push(airReading);
    renderAirTable();
    clearAirForm();
    
    // Salva nel localStorage
    if (dataManager) {
        dataManager.updateSettings({ airReadings });
    }
}

// Funzione per pulire il form aria
function clearAirForm() {
    airDatetime.value = '';
    airTempMin.value = '';
    airTempMax.value = '';
    airHumidityMin.value = '';
    airHumidityMax.value = '';
}

// Funzione per rimuovere un rilevamento aria
function removeAirReading(id) {
    if (confirm('Sei sicuro di voler rimuovere questo rilevamento?')) {
        airReadings = airReadings.filter(reading => reading.id !== id);
        renderAirTable();
        
        // Salva nel localStorage
        if (dataManager) {
            dataManager.updateSettings({ airReadings });
        }
    }
}

// Funzione per rendere la tabella aria
function renderAirTable() {
    if (!airTable) return;
    
    const tbody = airTable.querySelector('tbody');
    if (!tbody) return;
    
    if (airReadings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666; padding: 20px;">Nessun rilevamento registrato</td></tr>';
        return;
    }
    
    tbody.innerHTML = airReadings.map(reading => {
        return `
            <tr>
                <td class="mono">${fmtDateTimeLocal(reading.datetime)}</td>
                <td>${reading.tempMin}°C</td>
                <td>${reading.tempMax}°C</td>
                <td>${reading.humidityMin}%</td>
                <td>${reading.humidityMax}%</td>
                <td>
                    <button onclick="removeAirReading(${reading.id})" style="background: #f44336; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Funzione per validare i campi aria
function validateAirFields() {
    const tempMin = parseFloat(airTempMin.value) || 0;
    const tempMax = parseFloat(airTempMax.value) || 0;
    const humidityMin = parseFloat(airHumidityMin.value) || 0;
    const humidityMax = parseFloat(airHumidityMax.value) || 0;
    
    // Reset border colors
    [airTempMin, airTempMax, airHumidityMin, airHumidityMax].forEach(input => {
        if (input) input.style.borderColor = '';
    });
    
    if (tempMin > tempMax && tempMin > 0 && tempMax > 0) {
        airTempMin.style.borderColor = '#f44336';
        airTempMax.style.borderColor = '#f44336';
    }
    
    if (humidityMin > humidityMax && humidityMin > 0 && humidityMax > 0) {
        airHumidityMin.style.borderColor = '#f44336';
        airHumidityMax.style.borderColor = '#f44336';
    }
}

/* ==================== GESTIONE SOGLIE ==================== */

// Funzione per aggiornare gli stili dei valori fuori soglia
function updateThresholdStyling() {
    // Aggiorna gli input nella sezione "Nuovo valore"
    const waterFields = ['ph', 'kh', 'gh', 'no2', 'no3', 'nh4', 'temp', 'cond'];
    waterFields.forEach(field => {
        const input = document.getElementById(field);
        if (input && input.value) {
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                const isOutOfThreshold = isValueOutOfThreshold(field, value);
                if (isOutOfThreshold) {
                    input.style.background = '#ffebee';
                    input.style.borderColor = '#f44336';
                    input.style.color = '#d32f2f';
                } else {
                    input.style.background = '';
                    input.style.borderColor = '';
                    input.style.color = '';
                }
            }
        }
    });
    
    // Aggiorna gli input nella tabella
    const tableInputs = document.querySelectorAll('.table-input');
    tableInputs.forEach(input => {
        const field = input.dataset.field;
        const value = parseFloat(input.value);
        if (field && !isNaN(value)) {
            const isOutOfThreshold = isValueOutOfThreshold(field, value);
            if (isOutOfThreshold) {
                input.style.background = '#ffebee';
                input.style.borderColor = '#f44336';
                input.style.color = '#d32f2f';
            } else {
                input.style.background = '';
                input.style.borderColor = '';
                input.style.color = '';
            }
        }
    });
}

/* ==================== INTERVALLI GIORNALIERI ==================== */
function addSprayInterval() {
    if (!sprayStart.value || !sprayEnd.value) return alert('Inserisci inizio e fine');
    if (toMinutes(sprayEnd.value) <= toMinutes(sprayStart.value)) return alert('Fine deve essere dopo Inizio');
    
    plan.spray.push({ s: sprayStart.value, e: sprayEnd.value });
    if (dataManager && dataManager.updateDayTemplate) {
        dataManager.updateDayTemplate(plan);
    } else {
        console.error('DataManager non disponibile per salvare la programmazione spray');
    }
    updateGlobalData();
    renderDayTables();
    drawDayChart();
    clearSprayInputs();
}

function addFanInterval() {
    if (!fanStart.value || !fanEnd.value) return alert('Inserisci inizio e fine');
    if (toMinutes(fanEnd.value) <= toMinutes(fanStart.value)) return alert('Fine deve essere dopo Inizio');
    
    plan.fan.push({ s: fanStart.value, e: fanEnd.value });
    if (dataManager && dataManager.updateDayTemplate) {
        dataManager.updateDayTemplate(plan);
    } else {
        console.error('DataManager non disponibile per salvare la programmazione ventola');
    }
    updateGlobalData();
    renderDayTables();
    drawDayChart();
    clearFanInputs();
}

// Funzione rimossa - sostituita dalle nuove funzioni per tabelle separate

function clearSprayInputs() {
    sprayStart.value = '';
    sprayEnd.value = '';
    sprayStart.focus();
}

function clearFanInputs() {
    fanStart.value = '';
    fanEnd.value = '';
    fanStart.focus();
}

// ==================== GESTIONE TABELLE CANALI SEPARATE ====================

function addChannelRow(channelKey) {
    const table = channelTables[channelKey];
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="time" class="channel-time-input" placeholder="HH:MM"></td>
        <td><input type="number" min="0" max="100" class="channel-value-input" placeholder="0-100"></td>
        <td><button class="remove-row-btn" onclick="removeChannelRow(this)">🗑️ Elimina</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Focus sul campo ora
    const timeInput = row.querySelector('.channel-time-input');
    timeInput.focus();
    
    // Event listeners per salvataggio automatico
    timeInput.addEventListener('change', () => saveChannelData(channelKey));
    row.querySelector('.channel-value-input').addEventListener('change', () => saveChannelData(channelKey));
}

function removeChannelRow(button) {
    const row = button.closest('tr');
    row.remove();
    
    // Trova il canale dalla tabella
    const table = row.closest('table');
    const channelKey = Object.keys(channelTables).find(key => channelTables[key] === table);
    if (channelKey) {
        // Salva solo i dati di questo canale specifico
        saveChannelData(channelKey);
    }
}

function saveChannelData(channelKey) {
    const table = channelTables[channelKey];
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const channelData = [];
    
    rows.forEach(row => {
        const timeInput = row.querySelector('.channel-time-input');
        const valueInput = row.querySelector('.channel-value-input');
        
        if (timeInput.value && valueInput.value !== '') {
            channelData.push({
                t: timeInput.value,
                value: Math.max(0, Math.min(100, Number(valueInput.value) || 0))
            });
        }
    });
    
    // Ordina per ora
    channelData.sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
    
    // Aggiorna i dati del piano
    if (!plan.lights) plan.lights = [];
    
    // Rimuovi SOLO i dati esistenti per questo canale specifico
    plan.lights.forEach(item => {
        delete item[channelKey];
    });
    
    // Aggiungi i nuovi dati
    channelData.forEach(data => {
        const existingItem = plan.lights.find(item => item.t === data.t);
        if (existingItem) {
            existingItem[channelKey] = data.value;
        } else {
            const newItem = { t: data.t };
            newItem[channelKey] = data.value;
            plan.lights.push(newItem);
        }
    });
    
    // Pulisci gli oggetti vuoti (che hanno solo 't' e nessun canale)
    plan.lights = plan.lights.filter(item => {
        const hasAnyChannel = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].some(ch => 
            item[ch] !== undefined && item[ch] !== null
        );
        return hasAnyChannel;
    });
    
    // Salva i dati
    if (dataManager && dataManager.updateDayTemplate) {
        dataManager.updateDayTemplate(plan);
    }
    
    // Ridisegna solo il grafico
    drawDayChart();
}

function loadChannelData(channelKey) {
    const table = channelTables[channelKey];
    if (!table || !plan.lights) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Raccogli SOLO i dati per questo canale specifico da plan.lights
    const channelData = [];
    plan.lights.forEach(item => {
        if (item[channelKey] !== undefined && item[channelKey] !== null) {
            channelData.push({
                t: item.t,
                value: item[channelKey]
            });
        }
    });
    
    // Ordina per ora
    channelData.sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
    
    // Crea le righe
    channelData.forEach(data => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="time" class="channel-time-input" value="${data.t}"></td>
            <td><input type="number" min="0" max="100" class="channel-value-input" value="${data.value}"></td>
            <td><button class="remove-row-btn" onclick="removeChannelRow(this)">🗑️ Elimina</button></td>
        `;
        tbody.appendChild(row);
        
        // Event listeners
        row.querySelector('.channel-time-input').addEventListener('change', () => saveChannelData(channelKey));
        row.querySelector('.channel-value-input').addEventListener('change', () => saveChannelData(channelKey));
    });
}

function migrateOldLightData() {
    // Migra i dati vecchi dalla struttura unificata a quella separata
    if (!plan.lights || plan.lights.length === 0) return;
    
    const hasOldStructure = plan.lights.some(light => 
        light.ch1 !== undefined && light.ch2 !== undefined && 
        light.ch3 !== undefined && light.ch4 !== undefined && 
        light.ch5 !== undefined
    );
    
    if (hasOldStructure) {
        console.log('🔄 Migrazione dati luci dalla struttura vecchia a quella nuova...');
        
        // Crea un nuovo array con la struttura separata
        const newLights = [];
        
        plan.lights.forEach(light => {
            // Per ogni canale, crea un oggetto separato se ha un valore
            ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].forEach(channel => {
                if (light[channel] !== undefined && light[channel] !== null) {
                    newLights.push({
                        t: light.t,
                        [channel]: light[channel]
                    });
                }
            });
        });
        
        // Sostituisci i dati vecchi
        plan.lights = newLights;
        
        // Salva la migrazione
        if (dataManager && dataManager.updateDayTemplate) {
            dataManager.updateDayTemplate(plan);
        }
        
        console.log('✅ Migrazione completata');
    }
}

function loadAllChannelData() {
    // Verifica che plan.lights sia definito
    if (typeof plan === 'undefined' || !plan.lights) {
        if (typeof plan === 'undefined') {
            window.plan = { lights: [], spray: [], fan: [] };
        } else {
            plan.lights = [];
        }
    }
    
    // Migra i dati vecchi se necessario
    migrateOldLightData();
    
    // Carica ogni canale indipendentemente SOLO se i dati sono vuoti
    // Questo evita di sovrascrivere i dati già salvati
    if (!plan.lights || plan.lights.length === 0) {
        Object.keys(channelTables).forEach(channelKey => {
            loadChannelData(channelKey);
        });
    } else {
        // Se ci sono già dati, aggiorna solo la visualizzazione delle tabelle
        Object.keys(channelTables).forEach(channelKey => {
            loadChannelData(channelKey);
        });
    }
}

function renderDayTables() {
    renderSprayTable();
    renderFanTable();
    // Non chiamare loadAllChannelData() qui per evitare conflitti
    // I dati delle luci RGB vengono gestiti direttamente da saveChannelData()
}

function renderSprayTable() {
    if (!sprayTableBody) return;
    
    sprayTableBody.innerHTML = '';
    const sortedSpray = plan.spray.map((item, originalIndex) => ({ ...item, originalIndex }))
        .sort((a, b) => toMinutes(a.s) - toMinutes(b.s));
    
    sortedSpray.forEach((it, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="time" value="${it.s}" data-original-i="${it.originalIndex}" data-field="s" class="table-input"></td>
            <td><input type="time" value="${it.e}" data-original-i="${it.originalIndex}" data-field="e" class="table-input"></td>
            <td><button data-original-i="${it.originalIndex}" class="del-spray">🗑️ Elimina</button></td>
        `;
        sprayTableBody.appendChild(tr);
    });
    
    sprayTableBody.querySelectorAll('.del-spray').forEach(btn => {
        btn.onclick = () => {
            const i = Number(btn.getAttribute('data-original-i'));
            plan.spray.splice(i, 1);
            dataManager.updateDayTemplate(plan);
            updateGlobalData();
            renderDayTables();
            drawDayChart();
        };
    });
    
    sprayTableBody.querySelectorAll('.table-input').forEach(input => {
        input.addEventListener('change', () => {
            const i = Number(input.getAttribute('data-original-i'));
            const field = input.getAttribute('data-field');
            plan.spray[i][field] = input.value;
            dataManager.updateDayTemplate(plan);
            updateGlobalData();
            drawDayChart();
        });
    });
}

function renderFanTable() {
    if (!fanTableBody) return;
    
    fanTableBody.innerHTML = '';
    const sortedFan = plan.fan.map((item, originalIndex) => ({ ...item, originalIndex }))
        .sort((a, b) => toMinutes(a.s) - toMinutes(b.s));
    
    sortedFan.forEach((it, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="time" value="${it.s}" data-original-i="${it.originalIndex}" data-field="s" class="table-input"></td>
            <td><input type="time" value="${it.e}" data-original-i="${it.originalIndex}" data-field="e" class="table-input"></td>
            <td><button data-original-i="${it.originalIndex}" class="del-fan">🗑️ Elimina</button></td>
        `;
        fanTableBody.appendChild(tr);
    });
    
    fanTableBody.querySelectorAll('.del-fan').forEach(btn => {
        btn.onclick = () => {
            const i = Number(btn.getAttribute('data-original-i'));
            plan.fan.splice(i, 1);
            dataManager.updateDayTemplate(plan);
            updateGlobalData();
            renderDayTables();
            drawDayChart();
        };
    });
    
    fanTableBody.querySelectorAll('.table-input').forEach(input => {
        input.addEventListener('change', () => {
            const i = Number(input.getAttribute('data-original-i'));
            const field = input.getAttribute('data-field');
            plan.fan[i][field] = input.value;
            dataManager.updateDayTemplate(plan);
            updateGlobalData();
            drawDayChart();
        });
    });
}

// Funzione rimossa - sostituita dalle nuove funzioni per tabelle separate

function hookOkCancelButtons() {
    // Gestione pulsanti OK
    document.querySelectorAll('.ok-btn').forEach(btn => {
        const handleOkClick = () => {
            const id = btn.getAttribute('data-for');
            const el = document.getElementById(id);
            el && el.blur();
        };
        
        // Click per desktop
        btn.onclick = handleOkClick;
        
        // Touch per mobile
        btn.addEventListener('touchend', function(event) {
            event.preventDefault();
            handleOkClick();
        });
        
        // Feedback visivo per touch
        btn.addEventListener('touchstart', function(event) {
            event.preventDefault();
            btn.style.opacity = '0.7';
        });
        
        btn.addEventListener('touchend', function(event) {
            event.preventDefault();
            btn.style.opacity = '1';
        });
    });
    
    // Gestione pulsanti Clear
    document.querySelectorAll('.clear-btn').forEach(btn => {
        const handleClearClick = () => {
            const id = btn.getAttribute('data-for');
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.blur();
            }
        };
        
        // Click per desktop
        btn.onclick = handleClearClick;
        
        // Touch per mobile
        btn.addEventListener('touchend', function(event) {
            event.preventDefault();
            handleClearClick();
        });
        
        // Feedback visivo per touch
        btn.addEventListener('touchstart', function(event) {
            event.preventDefault();
            btn.style.opacity = '0.7';
        });
        
        btn.addEventListener('touchend', function(event) {
            event.preventDefault();
            btn.style.opacity = '1';
        });
    });
}

/* ==================== AGGIORNA DATI GLOBALI ==================== */
function updateGlobalData() {
    if (dataManager && dataManager.updateGlobalData) {
        dataManager.updateGlobalData();
    }
    
    // I dati delle luci RGB vengono gestiti direttamente da saveChannelData()
    // Non chiamare loadAllChannelData() qui per evitare conflitti
}

/* ==================== GESTIONE SOGLIE ACQUA ==================== */
function loadWaterThresholds() {
    const saved = localStorage.getItem('paludario.waterThresholds');
    if (saved) {
        try {
            waterThresholds = { ...waterThresholds, ...JSON.parse(saved) };
        } catch (e) {
            console.warn('Errore nel caricamento delle soglie:', e);
        }
    }
}

function saveWaterThresholds() {
    localStorage.setItem('paludario.waterThresholds', JSON.stringify(waterThresholds));
    // Salva anche su GitHub se disponibile
    if (dataManager && dataManager.updateSettings) {
        dataManager.updateSettings({ waterThresholds });
    }
}

function openWaterSettings() {
    generateThresholdSettings();
    waterSettingsModal.style.display = 'block';
}

function closeWaterSettings() {
    waterSettingsModal.style.display = 'none';
}

function generateThresholdSettings() {
    if (!thresholdSettings) return;
    
    const paramNames = {
        ph: { name: 'pH', unit: '', icon: '🧪' },
        kh: { name: 'KH', unit: 'dKH', icon: '⚗️' },
        gh: { name: 'GH', unit: 'dGH', icon: '🔬' },
        no2: { name: 'NO2', unit: 'mg/L', icon: '⚠️' },
        no3: { name: 'NO3', unit: 'mg/L', icon: '⚠️' },
        nh4: { name: 'NH4', unit: 'mg/L', icon: '☠️' },
        temp: { name: 'Temperatura', unit: '°C', icon: '🌡️' },
        cond: { name: 'Conducibilità', unit: 'µS/cm', icon: '⚡' }
    };
    
    thresholdSettings.innerHTML = '';
    
    Object.keys(waterThresholds).forEach(param => {
        const config = paramNames[param];
        const threshold = waterThresholds[param];
        
        const item = document.createElement('div');
        item.className = 'threshold-item';
        item.style.cssText = 'background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px;';
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <span style="font-size: 20px;">${config.icon}</span>
                <div>
                    <h3 style="margin: 0; font-size: 16px; color: #333;">${config.name}</h3>
                    <span style="font-size: 12px; color: #666;">${config.unit}</span>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 4px;">Minimo</label>
                    <input type="number" step="0.01" id="threshold-${param}-min" value="${threshold.min}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 4px;">Massimo</label>
                    <input type="number" step="0.01" id="threshold-${param}-max" value="${threshold.max}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            </div>
        `;
        
        thresholdSettings.appendChild(item);
    });
}

function saveThresholds() {
    Object.keys(waterThresholds).forEach(param => {
        const minInput = document.getElementById(`threshold-${param}-min`);
        const maxInput = document.getElementById(`threshold-${param}-max`);
        
        if (minInput && maxInput) {
            waterThresholds[param].min = parseFloat(minInput.value) || 0;
            waterThresholds[param].max = parseFloat(maxInput.value) || 0;
        }
    });
    
    saveWaterThresholds();
    closeWaterSettings();
    
    // Aggiorna la tabella per mostrare le nuove soglie
    renderWaterTable();
    
}

function resetThresholds() {
    waterThresholds = {
        ph: { min: 6.0, max: 8.0 },
        kh: { min: 2.0, max: 15.0 },
        gh: { min: 3.0, max: 20.0 },
        no2: { min: 0.0, max: 0.5 },
        no3: { min: 0.0, max: 50.0 },
        nh4: { min: 0.0, max: 0.5 },
        temp: { min: 20.0, max: 30.0 },
        cond: { min: 100, max: 1000 }
    };
    
    generateThresholdSettings();
}

function isValueOutOfThreshold(param, value) {
    if (value === null || value === undefined || value === '') return false;
    
    const threshold = waterThresholds[param];
    if (!threshold) return false;
    
    const numValue = Number(value);
    return numValue < threshold.min || numValue > threshold.max;
}

// L'inizializzazione è ora gestita da paludario-app.js
