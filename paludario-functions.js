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
let water = [];
let plan = { spray: [], fan: [], lights: [] };
let showBackgrounds = true;
let darkMode = false;
let showFill = true;

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
const waterTableBody = document.querySelector('#water-table tbody');
const paramSelect = document.getElementById('param-select');
const refreshWaterChartBtn = document.getElementById('refresh-water-chart');
const waterCanvas = document.getElementById('waterChart');

const sprayStart = document.getElementById('spray-start');
const sprayEnd = document.getElementById('spray-end');
const addSprayBtn = document.getElementById('add-spray');
const clearSprayBtn = document.getElementById('clear-spray');
const sprayTableBody = document.querySelector('#spray-table tbody');

const fanStart = document.getElementById('fan-start');
const fanEnd = document.getElementById('fan-end');
const addFanBtn = document.getElementById('add-fan');
const clearFanBtn = document.getElementById('clear-fan');
const fanTableBody = document.querySelector('#fan-table tbody');

const lightTime = document.getElementById('light-time');
const ch1 = document.getElementById('ch1');
const ch2 = document.getElementById('ch2');
const ch3 = document.getElementById('ch3');
const ch4 = document.getElementById('ch4');
const ch5 = document.getElementById('ch5');
const addLightBtn = document.getElementById('add-light');
const clearLightsBtn = document.getElementById('clear-lights');
const lightTableBody = document.querySelector('#light-table tbody');

const refreshDayChartBtn = document.getElementById('refresh-day-chart');
const toggleBackgroundsBtn = document.getElementById('toggle-backgrounds');
const toggleFillBtn = document.getElementById('toggle-fill');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const dayCanvas = document.getElementById('dayChart');
const dayLegend = document.getElementById('dayLegend');
const mainTitle = document.getElementById('main-title');
const litersInput = document.getElementById('liters');
const syncDataBtn = document.getElementById('sync-data');

/* ==================== INIZIALIZZAZIONE ==================== */
function initializeApp() {
    // Imposta data/ora corrente
    if (waterDt) {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        waterDt.value = d.toISOString().slice(0, 16);
    }

    // Event listeners
    setupEventListeners();

    // Carica dati dopo aver impostato i listener
    if (dataManager && dataManager.loadData) {
        dataManager.loadData().then(() => {
            // Aggiorna i dati globali dopo il caricamento
            updateGlobalData();
        });
    }
}

function setupEventListeners() {
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

    // Luci
    if (addLightBtn) {
        addLightBtn.onclick = addLightValue;
    }
    if (clearLightsBtn) {
        clearLightsBtn.onclick = clearLightInputs;
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
    }

    if (toggleFillBtn) {
        toggleFillBtn.onclick = () => {
            showFill = !showFill;
            toggleFillBtn.textContent = showFill ? '📊 Grafico Pieno' : '📊 Grafico Vuoto';
            drawDayChart();
        };
    }

    if (darkModeToggle) {
        darkModeToggle.onclick = () => {
            darkMode = !darkMode;
            document.body.classList.toggle('dark-mode', darkMode);
            darkModeToggle.textContent = darkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
            darkModeToggle.style.background = darkMode ? '#555' : '#333';
            dataManager.updateSettings({ darkMode });
            drawWaterChart();
            drawDayChart();
        };
    }

    if (syncDataBtn) {
        syncDataBtn.onclick = () => dataManager.loadData();
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
    
    water.push(rec);
    if (dataManager && dataManager.updateWater) {
        dataManager.updateWater(water);
    } else {
        console.error('DataManager non disponibile per salvare i valori acqua');
    }
    renderWaterTable();
    drawWaterChart();
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

function renderWaterTable() {
    if (!waterTableBody) return;
    
    waterTableBody.innerHTML = '';
    const sorted = [...water].sort((a, b) => new Date(b.ts) - new Date(a.ts));
    
    for (const row of sorted) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="mono">${fmtDateTimeLocal(row.ts)}</td>
            <td><input type="number" step="0.01" min="0" value="${row.ph ?? ''}" data-id="${row.id}" data-field="ph" class="table-input"></td>
            <td><input type="number" step="0.1" min="0" value="${row.kh ?? ''}" data-id="${row.id}" data-field="kh" class="table-input"></td>
            <td><input type="number" step="0.1" min="0" value="${row.gh ?? ''}" data-id="${row.id}" data-field="gh" class="table-input"></td>
            <td><input type="number" step="0.01" min="0" value="${row.no2 ?? ''}" data-id="${row.id}" data-field="no2" class="table-input"></td>
            <td><input type="number" step="0.1" min="0" value="${row.no3 ?? ''}" data-id="${row.id}" data-field="no3" class="table-input"></td>
            <td><input type="number" step="0.01" min="0" value="${row.nh4 ?? ''}" data-id="${row.id}" data-field="nh4" class="table-input"></td>
            <td><input type="number" step="0.1" min="0" value="${row.temp ?? ''}" data-id="${row.id}" data-field="temp" class="table-input"></td>
            <td><input type="number" step="1" min="0" value="${row.cond ?? ''}" data-id="${row.id}" data-field="cond" class="table-input"></td>
            <td><button data-id="${row.id}" class="del-water">🗑️ Elimina</button></td>
        `;
        waterTableBody.appendChild(tr);
    }
    
    // Event listeners per eliminare
    waterTableBody.querySelectorAll('.del-water').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            water = water.filter(w => w.id !== id);
            dataManager.updateWater(water);
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
                dataManager.updateWater(water);
                drawWaterChart();
            }
        });
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
    renderDayTables();
    drawDayChart();
    clearFanInputs();
}

function addLightValue() {
    if (!lightTime.value) return alert('Inserisci l\'ora');
    const val = v => Math.max(0, Math.min(100, Number(v || 0)));
    
    plan.lights.push({
        t: lightTime.value,
        ch1: val(ch1.value),
        ch2: val(ch2.value),
        ch3: val(ch3.value),
        ch4: val(ch4.value),
        ch5: val(ch5.value)
    });
    
    if (dataManager && dataManager.updateDayTemplate) {
        dataManager.updateDayTemplate(plan);
    } else {
        console.error('DataManager non disponibile per salvare la programmazione luci');
    }
    renderDayTables();
    drawDayChart();
    clearLightInputs();
}

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

function clearLightInputs() {
    lightTime.value = '';
    [ch1, ch2, ch3, ch4, ch5].forEach(i => i.value = '');
    lightTime.focus();
}

function renderDayTables() {
    renderSprayTable();
    renderFanTable();
    renderLightTable();
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
            drawDayChart();
        });
    });
}

function renderLightTable() {
    if (!lightTableBody) return;
    
    lightTableBody.innerHTML = '';
    const sortedLights = plan.lights.map((item, originalIndex) => ({ ...item, originalIndex }))
        .sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
    
    sortedLights.forEach((it, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="time" value="${it.t}" data-original-i="${it.originalIndex}" data-field="t" class="table-input"></td>
            <td><input type="number" min="0" max="100" value="${it.ch1}" data-original-i="${it.originalIndex}" data-field="ch1" class="table-input"></td>
            <td><input type="number" min="0" max="100" value="${it.ch2}" data-original-i="${it.originalIndex}" data-field="ch2" class="table-input"></td>
            <td><input type="number" min="0" max="100" value="${it.ch3}" data-original-i="${it.originalIndex}" data-field="ch3" class="table-input"></td>
            <td><input type="number" min="0" max="100" value="${it.ch4}" data-original-i="${it.originalIndex}" data-field="ch4" class="table-input"></td>
            <td><input type="number" min="0" max="100" value="${it.ch5}" data-original-i="${it.originalIndex}" data-field="ch5" class="table-input"></td>
            <td><button data-original-i="${it.originalIndex}" class="del-light">🗑️ Elimina</button></td>
        `;
        lightTableBody.appendChild(tr);
    });
    
    lightTableBody.querySelectorAll('.del-light').forEach(btn => {
        btn.onclick = () => {
            const i = Number(btn.getAttribute('data-original-i'));
            plan.lights.splice(i, 1);
            dataManager.updateDayTemplate(plan);
            renderDayTables();
            drawDayChart();
        };
    });
    
    lightTableBody.querySelectorAll('.table-input').forEach(input => {
        input.addEventListener('change', () => {
            const i = Number(input.getAttribute('data-original-i'));
            const field = input.getAttribute('data-field');
            plan.lights[i][field] = field === 't' ? input.value : Number(input.value);
            dataManager.updateDayTemplate(plan);
            drawDayChart();
        });
    });
}

function hookOkCancelButtons() {
    document.querySelectorAll('.ok-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-for');
            const el = document.getElementById(id);
            el && el.blur();
        };
    });
    
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-for');
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.blur();
            }
        };
    });
}

/* ==================== AGGIORNA DATI GLOBALI ==================== */
function updateGlobalData() {
    if (dataManager && dataManager.updateGlobalData) {
        dataManager.updateGlobalData();
    } else if (dataManager && dataManager.data) {
        water = dataManager.data.water || [];
        plan = dataManager.data.dayTemplate || { spray: [], fan: [], lights: [] };
        darkMode = dataManager.data.settings?.darkMode || false;
    }
}

// Inizializza l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // Aggiorna dati globali quando i dati vengono caricati
    if (dataManager && dataManager.data) {
        water = dataManager.data.water || [];
        plan = dataManager.data.dayTemplate || { spray: [], fan: [], lights: [] };
        darkMode = dataManager.data.settings?.darkMode || false;
    }
});
