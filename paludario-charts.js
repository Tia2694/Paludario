/* ==================== VARIABILI GLOBALI ==================== */
// Stato visibilità canali
let visibleChannels = {
    ch1: true,
    ch2: true,
    ch3: true,
    ch4: true,
    ch5: true,
    spray: true,
    fan: true
};

/* ==================== UTILITÀ CANVAS ==================== */
function setCanvasHiDPI(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 600;
    const cssH = canvas.clientHeight || 190;
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return ctx;
}

function drawAxes(ctx, x0, y0, x1, y1) {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y1);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, y1);
    ctx.stroke();
}

function drawTicksX(ctx, x0, y1, xScale, labels) {
    ctx.fillStyle = COLORS.Axis;
    ctx.font = '12px system-ui';
    for (const { v, label } of labels) {
        const x = xScale(v);
        ctx.strokeStyle = '#eee';
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y1 - 4);
        ctx.stroke();
        ctx.fillText(label, x - 12, y1 + 14);
    }
}

// Funzione per formattare i valori Y in modo pulito
function formatTickValue(value) {
    // Se è un numero intero, mostralo senza decimali
    if (Number.isInteger(value)) {
        return value.toString();
    }
    
    // Per il pH, mostra sempre .0 o .5 (nessun altro decimale)
    const decimal = value % 1;
    if (Math.abs(decimal) < 0.25) {
        // Valore più vicino a .0
        return Math.floor(value).toString() + '.0';
    } else if (Math.abs(decimal - 0.5) < 0.25) {
        // Valore più vicino a .5
        return Math.floor(value).toString() + '.5';
    } else {
        // Per altri valori decimali, usa massimo 2 cifre decimali
        const formatted = value.toFixed(2);
        return formatted.replace(/\.?0+$/, '');
    }
}

function drawTicksY(ctx, x0, y0, y1, yScale, values, right = false) {
    ctx.fillStyle = COLORS.Axis;
    ctx.font = '12px system-ui';
    ctx.textAlign = right ? 'right' : 'left';
    for (const v of values) {
        const y = yScale(v);
        ctx.strokeStyle = '#eee';
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + (right ? -4 : 4), y);
        ctx.stroke();
        ctx.fillText(formatTickValue(v), right ? x0 - 8 : x0 + 8, y - 2);
    }
    ctx.textAlign = 'left';
}

function drawTicksYDayChart(ctx, x0, y0, y1, yScale, values, right = false) {
    ctx.font = '12px system-ui';
    ctx.textAlign = right ? 'right' : 'left';
    for (const v of values) {
        const y = yScale(v);
        ctx.strokeStyle = '#eee';
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + (right ? -4 : 4), y);
        ctx.stroke();
        
        if (darkMode) {
            ctx.fillStyle = '#ffffff';
        } else {
            if (v === 100 || v === 1) {
                ctx.fillStyle = '#000000';
            } else {
                ctx.fillStyle = showBackgrounds ? '#ffffff' : '#000000';
            }
        }
        
        ctx.fillText(formatTickValue(v), right ? x0 - 8 : x0 + 8, y - 2);
    }
    ctx.textAlign = 'left';
}

function line(ctx, pts, color, width = 2) {
    if (!pts.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
}

/* ==================== GRAFICO VALORI ACQUA ==================== */
function drawWaterChart() {
    if (!waterCanvas) return;
    
    const ctx = setCanvasHiDPI(waterCanvas);
    ctx.clearRect(0, 0, waterCanvas.width, waterCanvas.height);
    const param = paramSelect.value;
    const data = water
        .filter(w => w[param] !== null && w[param] !== undefined)
        .sort((a, b) => new Date(a.ts) - new Date(b.ts))
        .map(w => ({ t: new Date(w.ts).getTime(), v: Number(w[param]) }));

    const pad = { l: 54, r: 12, t: 12, b: 28 };
    const x0 = pad.l, x1 = (waterCanvas.clientWidth || 600) - pad.r;
    const y0 = pad.t, y1 = (waterCanvas.clientHeight || 190) - pad.b;

    drawAxes(ctx, x0, y0, x1, y1);
    if (data.length === 0) {
        ctx.fillStyle = '#888';
        ctx.fillText('Nessun dato', x0 + 8, (y0 + y1) / 2);
        return;
    }

    const minX = data[0].t;
    let maxX = data[data.length - 1].t;
    
    // Se c'è un solo dato, crea un range temporale di 24 ore per una migliore visualizzazione
    if (data.length === 1) {
        maxX = minX + 24 * 60 * 60 * 1000; // 24 ore dopo
    }

    // Scale predefinite per ogni parametro dell'acqua
    const parameterRanges = {
        'ph': { min: 0, max: 14, step: 0.5 },
        'kh': { min: 0, max: 20, step: 1 },
        'gh': { min: 0, max: 25, step: 1 },
        'no2': { min: 0, max: 0.5, step: 0.05 },
        'no3': { min: 0, max: 50, step: 1 },
        'nh4': { min: 0, max: 0.5, step: 0.05 },
        'temp': { min: 15, max: 35, step: 2 },
        'cond': { min: 0, max: 1000, step: 1 }
    };
    
    // Ottieni il range per il parametro corrente
    const range = parameterRanges[param] || { min: 0, max: 10, step: 1 };
    let minY = range.min;
    let maxY = range.max;
    
    // Se ci sono dati, adatta il range per mostrare meglio i valori effettivi
    if (data.length > 0) {
        const values = data.map(d => d.v);
        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        
        // Se tutti i valori sono uguali, crea un range simmetrico
        if (dataMin === dataMax) {
            const center = dataMin;
            const padding = Math.max(range.step, Math.abs(center) * 0.1);
            minY = Math.max(range.min, center - padding);
            maxY = Math.min(range.max, center + padding);
        } else {
            // Calcola il range dei dati con padding
            const dataRange = dataMax - dataMin;
            const padding = Math.max(range.step * 0.5, dataRange * 0.1);
            
            minY = Math.max(range.min, dataMin - padding);
            maxY = Math.min(range.max, dataMax + padding);
        }
    }

    const xScale = v => x0 + (v - minX) / (maxX - minX) * (x1 - x0);
    const yScale = v => y1 - (v - minY) / (maxY - minY) * (y1 - y0);

    // Genera tick usando lo step specifico del parametro
    const yTicks = [];
    const tickStep = range.step;
    
    // Genera tick basati sullo step del parametro
    const startTick = Math.floor(minY / tickStep) * tickStep;
    const endTick = Math.ceil(maxY / tickStep) * tickStep;
    
    for (let tick = startTick; tick <= endTick; tick += tickStep) {
        if (tick >= minY && tick <= maxY) {
            yTicks.push(tick);
        }
    }
    
    // Se non ci sono abbastanza tick, aggiungi tick intermedi
    if (yTicks.length < 3) {
        const steps = Math.max(3, Math.ceil((maxY - minY) / tickStep));
        for (let i = 0; i <= steps; i++) {
            const tick = minY + (maxY - minY) * i / steps;
            if (!yTicks.includes(tick)) {
                yTicks.push(tick);
            }
        }
    }
    
    yTicks.sort((a, b) => a - b);
    drawTicksY(ctx, x0, y0, y1, yScale, yTicks);

    const rangeMs = maxX - minX;
    const useTime = rangeMs <= 36 * 60 * 60 * 1000;
    const labels = [];
    let lastX = -Infinity;
    const minGapPx = 54;
    for (const d of data) {
        const x = xScale(d.t);
        if (x - lastX >= minGapPx) {
            const dt = new Date(d.t);
            const label = useTime ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : dt.toLocaleDateString();
            labels.push({ v: d.t, label });
            lastX = x;
        }
    }
    drawTicksX(ctx, x0, y1, xScale, labels);

    const pts = data.map(d => ({ x: xScale(d.t), y: yScale(d.v) }));
    
    // Disegna la linea solo se ci sono almeno 2 punti
    if (pts.length > 1) {
        line(ctx, pts, '#1976d2', 2);
    }
    
    // Disegna sempre i pallini su tutti i punti (anche se è solo uno)
    ctx.fillStyle = '#1976d2';
    pts.forEach(p => { 
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2); 
        ctx.fill(); 
    });
}

/* ==================== CALCOLO ALBA E TRAMONTO ==================== */
function calculateSunrise() {
    const sortedLights = plan.lights.sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
    
    // Trova il primo punto con luce > 0
    let firstLightOnIndex = -1;
    for (let i = 0; i < sortedLights.length; i++) {
        const light = sortedLights[i];
        const totalLight = (light.ch1 || 0) + (light.ch2 || 0) + (light.ch3 || 0) + (light.ch4 || 0) + (light.ch5 || 0);
        if (totalLight > 0) {
            firstLightOnIndex = i;
            break;
        }
    }
    
    // Se c'è un punto precedente, usa quello (valore 0)
    if (firstLightOnIndex > 0) {
        return toMinutes(sortedLights[firstLightOnIndex - 1].t);
    } else if (firstLightOnIndex === 0) {
        // Se il primo punto è già con luce > 0, usa quello
        return toMinutes(sortedLights[0].t);
    }
    
    return null;
}

function calculateSunset() {
    const sortedLights = plan.lights.sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
    let lastLightOn = null;
    
    for (let i = sortedLights.length - 1; i >= 0; i--) {
        const light = sortedLights[i];
        const totalLight = (light.ch1 || 0) + (light.ch2 || 0) + (light.ch3 || 0) + (light.ch4 || 0) + (light.ch5 || 0);
        if (totalLight > 0) {
            lastLightOn = toMinutes(light.t);
            break;
        }
    }
    
    if (lastLightOn === null) return null;
    
    for (const light of sortedLights) {
        const totalLight = (light.ch1 || 0) + (light.ch2 || 0) + (light.ch3 || 0) + (light.ch4 || 0) + (light.ch5 || 0);
        if (totalLight === 0 && toMinutes(light.t) > lastLightOn) {
            return toMinutes(light.t);
        }
    }
    
    return lastLightOn + 60;
}

function calculateSunsetAllZero() {
    const sortedLights = plan.lights.sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
    let lastLight = 18 * 60;
    for (const light of sortedLights) {
        const allZero = (light.ch1 || 0) === 0 && (light.ch2 || 0) === 0 && (light.ch3 || 0) === 0 && (light.ch4 || 0) === 0 && (light.ch5 || 0) === 0;
        if (allZero) {
            lastLight = toMinutes(light.t);
        }
    }
    return lastLight;
}

/* ==================== FUNZIONI PER GRAFICI GIORNALIERI ==================== */
function drawNightBackground(ctx, x0, y0, x1, y1, sunriseTime, sunsetTime) {
    const xScale = v => x0 + (v - 0) / (24 * 60 - 0) * (x1 - x0);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    
    if (sunriseTime !== null && sunsetTime !== null && sunsetTime > sunriseTime) {
        const sunriseX = xScale(sunriseTime);
        const sunsetX = xScale(sunsetTime);
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(sunriseX, y0, sunsetX - sunriseX, y1 - y0);
    }
}

function drawSunIcons(ctx, x0, y0, x1, y1, sunriseTime, sunsetTime) {
    const xScale = v => x0 + (v - 0) / (24 * 60 - 0) * (x1 - x0);
    
    if (sunriseTime !== null && sunsetTime !== null) {
        const sunriseX = xScale(sunriseTime);
        const sunsetX = xScale(sunsetTime);
        
        const sunriseY = y0 + (y1 - y0) * 0.5;
        drawSunIcon(ctx, sunriseX, sunriseY, 'sunrise');
        
        const sunsetAllZero = calculateSunsetAllZero();
        const sunsetXAllZero = xScale(sunsetAllZero);
        drawSunIcon(ctx, sunsetXAllZero, sunriseY, 'sunset');
        
        const sortedLights = plan.lights.sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
        let sunCenterTime = null;
        if (sortedLights.length >= 2) {
            const firstLight = toMinutes(sortedLights[0].t);
            const lastLight = toMinutes(sortedLights[sortedLights.length - 1].t);
            sunCenterTime = (firstLight + lastLight) / 2;
            const midX = xScale(sunCenterTime);
            const midY = y0 + (y1 - y0) * 0.2;
            drawSunIcon(ctx, midX, midY, 'noon');
        }
        
        if (sunCenterTime !== null) {
            const moonTime = (sunCenterTime + 12 * 60) % (24 * 60);
            const moonX = xScale(moonTime);
            const moonY = y0 + (y1 - y0) * 0.3;
            drawMoonIcon(ctx, moonX, moonY);
        }
    } else {
        const moonTime = 12 * 60;
        const moonX = xScale(moonTime);
        const moonY = y0 + (y1 - y0) * 0.3;
        drawMoonIcon(ctx, moonX, moonY);
    }
}

function drawSunIcon(ctx, x, y, type) {
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#ff8f00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const startX = x + Math.cos(angle) * 10;
        const startY = y + Math.sin(angle) * 10;
        const endX = x + Math.cos(angle) * 14;
        const endY = y + Math.sin(angle) * 14;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    if (type === 'sunrise') {
        ctx.strokeStyle = '#ff8f00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x, y - 30);
        ctx.moveTo(x - 3, y - 27);
        ctx.lineTo(x, y - 30);
        ctx.lineTo(x + 3, y - 27);
        ctx.stroke();
    } else if (type === 'sunset') {
        ctx.strokeStyle = '#ff8f00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x, y + 30);
        ctx.moveTo(x - 3, y + 27);
        ctx.lineTo(x, y + 30);
        ctx.lineTo(x + 3, y + 27);
        ctx.stroke();
    }
}

function drawMoonIcon(ctx, x, y) {
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.arc(x - 2, y - 1, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const starX = x + Math.cos(angle) * 15;
        const starY = y + Math.sin(angle) * 15;
        drawStar(ctx, starX, starY, 2);
    }
    
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const starX = x + Math.cos(angle) * 25;
        const starY = y + Math.sin(angle) * 25;
        drawStar(ctx, starX, starY, 1.5);
    }
    
    const randomStars = [
        { x: x + 30, y: y - 20 },
        { x: x - 25, y: y + 15 },
        { x: x + 35, y: y + 10 },
        { x: x - 30, y: y - 15 },
        { x: x + 20, y: y + 25 },
        { x: x - 20, y: y - 25 }
    ];
    
    randomStars.forEach(star => {
        drawStar(ctx, star.x, star.y, 1);
    });
}

function drawStar(ctx, x, y, size) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5;
        const radius = (i % 2 === 0) ? size : size * 0.4;
        const starX = x + Math.cos(angle) * radius;
        const starY = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(starX, starY);
        else ctx.lineTo(starX, starY);
    }
    ctx.closePath();
    ctx.fill();
}

function drawSkyGradient(ctx, x0, y0, x1, y1, sunriseTime, sunsetTime) {
    if (sunriseTime === null || sunsetTime === null) {
        return;
    }
    
    const xScale = v => x0 + (v - 0) / (24 * 60 - 0) * (x1 - x0);
    const sunriseX = xScale(sunriseTime);
    const sunsetX = xScale(sunsetTime);
    
    const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
    
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(Math.max(0, sunriseX / x1 - 0.15), '#1a1a2e');
    gradient.addColorStop(Math.max(0, sunriseX / x1 - 0.1), '#2c1810');
    gradient.addColorStop(Math.max(0, sunriseX / x1 - 0.05), '#4a2c1a');
    gradient.addColorStop(Math.max(0, sunriseX / x1 - 0.02), '#ff6b6b');
    gradient.addColorStop(sunriseX / x1, '#ffa726');
    gradient.addColorStop(Math.min(1, sunriseX / x1 + 0.02), '#ffeb3b');
    gradient.addColorStop(Math.min(1, sunriseX / x1 + 0.05), '#87ceeb');
    gradient.addColorStop(Math.max(0, sunsetX / x1 - 0.05), '#87ceeb');
    gradient.addColorStop(Math.max(0, sunsetX / x1 - 0.02), '#ffa726');
    gradient.addColorStop(sunsetX / x1, '#ff6b6b');
    gradient.addColorStop(Math.min(1, sunsetX / x1 + 0.05), '#4a2c1a');
    gradient.addColorStop(Math.min(1, sunsetX / x1 + 0.1), '#2c1810');
    gradient.addColorStop(1, '#1a1a2e');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

/* ==================== GRAFICO GIORNALIERO COMPLETO ==================== */
function drawDayChart() {
    if (!dayCanvas) return;
    
    const ctx = setCanvasHiDPI(dayCanvas);
    ctx.clearRect(0, 0, dayCanvas.width, dayCanvas.height);
    const pad = { l: 50, r: 34, t: 12, b: 28 };
    const x0 = pad.l, x1 = (dayCanvas.clientWidth || 600) - pad.r;
    const y0 = pad.t, y1 = (dayCanvas.clientHeight || 190) - pad.b;
    
    const sunriseTime = calculateSunrise();
    const sunsetTime = calculateSunset();
    
    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y1);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, y1);
    ctx.stroke();
    const minX = 0, maxX = 24 * 60;
    const xScale = v => x0 + (v - minX) / (maxX - minX) * (x1 - x0);
    const yLScale = v => y1 - (v - 0) / (100 - 0) * (y1 - y0);
    const yRScale = v => y1 - (v - 0) / (1 - 0) * (y1 - y0);
    const xLabels = [];
    for (let h = 0; h <= 24; h += 2) { xLabels.push({ v: h * 60, label: String(h).padStart(2, '0') + ':00' }); }
    drawTicksX(ctx, x0, y1, xScale, xLabels);

    if (showBackgrounds) {
        drawNightBackground(ctx, x0, y0, x1, y1, sunriseTime, sunsetTime);
        drawSkyGradient(ctx, x0, y0, x1, y1, sunriseTime, sunsetTime);
    }
    
    drawSunIcons(ctx, x0, y0, x1, y1, sunriseTime, sunsetTime);
    
    const baseY = yLScale(0);

    const toPts = (arr, yscale) => arr.map(p => ({ x: xScale(p.x), y: yscale(p.y) }));
    
    // Disegna ogni canale direttamente dai dati delle tabelle
    [{ key: 'ch1', color: COLORS.R }, { key: 'ch2', color: COLORS.G }, { key: 'ch3', color: COLORS.B }, { key: 'ch4', color: COLORS.W }, { key: 'ch5', color: COLORS.Plaf }]
        .forEach(ch => {
            if (visibleChannels[ch.key]) {
                // Raccogli i dati per questo canale specifico
                const channelData = [];
                if (plan.lights) {
                    plan.lights.forEach(item => {
                        if (item[ch.key] !== undefined && item[ch.key] !== null) {
                            channelData.push({
                                x: toMinutes(item.t),
                                y: item[ch.key]
                            });
                        }
                    });
                }
                
                // Ordina per ora
                channelData.sort((a, b) => a.x - b.x);
                
                // Disegna solo se ci sono dati
                if (channelData.length > 0) {
                    const points = toPts(channelData, yLScale);
                    const keyframes = toPts(channelData, yLScale);
                    drawLinearWithFill(ctx, points, ch.color, 2, baseY, keyframes);
                }
            }
        });
    
    const sprayPts = genStepSeriesFromIntervals(plan.spray, 1);
    if (sprayPts.length > 0 && visibleChannels.spray) {
        drawStepped(ctx, toPts(sprayPts, yRScale), COLORS.Spray, 2, baseY);
    }
    
    const fanPts = genStepSeriesFromIntervals(plan.fan, 1);
    if (fanPts.length > 0 && visibleChannels.fan) {
        drawStepped(ctx, toPts(fanPts, yRScale), COLORS.Ventola, 2, baseY);
    }

    drawTicksYDayChart(ctx, x0, y0, y1, yLScale, [0, 20, 40, 60, 80, 100], false);
    ctx.save();
    ctx.translate(x1 + pad.r - 26, 0);
    drawTicksYDayChart(ctx, 0, y0, y1, yRScale, [0, 1], true);
    ctx.restore();

    if (dayLegend) {
        dayLegend.innerHTML = '';
        [{ label: 'R', color: COLORS.R, key: 'ch1' }, { label: 'G', color: COLORS.G, key: 'ch2' }, { label: 'B', color: COLORS.B, key: 'ch3' }, { label: 'W', color: COLORS.W, key: 'ch4' }, { label: 'Plafoniera', color: COLORS.Plaf, key: 'ch5' }, { label: 'Spray Pioggia', color: COLORS.Spray, key: 'spray' }, { label: 'Ventola', color: COLORS.Ventola, key: 'fan' }]
            .forEach(it => {
                const s = document.createElement('span');
                s.style.cursor = 'pointer';
                s.style.userSelect = 'none';
                s.style.padding = '4px 8px';
                s.style.margin = '2px';
                s.style.borderRadius = '4px';
                s.style.display = 'inline-block';
                s.style.transition = 'opacity 0.3s';
                s.dataset.channel = it.key;
                
                const i = document.createElement('i');
                i.style.background = it.color;
                i.style.width = '12px';
                i.style.height = '12px';
                i.style.display = 'inline-block';
                i.style.marginRight = '6px';
                i.style.borderRadius = '2px';
                
                s.appendChild(i);
                s.appendChild(document.createTextNode(it.label));
                dayLegend.appendChild(s);
                
                // Event listener per toggle
                s.addEventListener('click', () => {
                    toggleChannel(it.key);
                });
                
                // Imposta lo stato iniziale
                s.style.opacity = visibleChannels[it.key] ? '1' : '0.3';
            });
    }
}

function drawStepped(ctx, pts, color, width = 2, baseY) {
    if (!pts.length) return;
    
    if (showFill) {
        ctx.fillStyle = color + '40';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i - 1].y);
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.lineTo(pts[pts.length - 1].x, baseY);
        ctx.lineTo(pts[0].x, baseY);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    
    // Aggiungi pallini sui punti di giunzione
    ctx.fillStyle = color;
    pts.forEach(p => { 
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2); 
        ctx.fill(); 
    });
}

function genStepSeriesFromIntervals(intervals, high = 1) {
    const points = [];
    points.push({ x: 0, y: 0 });
    const sorted = [...intervals].sort((a, b) => toMinutes(a.s) - toMinutes(b.s));
    
    for (const { s, e } of sorted) {
        const msS = toMinutes(s), msE = toMinutes(e);
        points.push({ x: msS, y: 0 });
        points.push({ x: msS, y: high });
        points.push({ x: msE, y: high });
        points.push({ x: msE, y: 0 });
    }
    points.push({ x: 24 * 60, y: 0 });
    
    const hasNonZeroValues = points.some(p => p.y > 0);
    if (!hasNonZeroValues) {
        return [];
    }
    
    return points.filter((p, i, a) => i === 0 || p.x !== a[i - 1].x || p.y !== a[i - 1].y);
}

function genStepSeriesFromKeyframes(keys, key) {
    const sorted = [...keys].sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
    const pts = [];
    let cur = 0;
    
    // Inizia sempre da 0 alle 00:00 per coerenza con la fine del grafico
    pts.push({ x: 0, y: 0 });
    
    for (const k of sorted) {
        const t = toMinutes(k.t);
        pts.push({ x: t, y: cur });
        cur = Math.max(0, Math.min(100, Number(k[key] || 0)));
        pts.push({ x: t, y: cur });
    }
    pts.push({ x: 24 * 60, y: cur });
    
    const hasNonZeroValues = pts.some(p => p.y > 0);
    if (!hasNonZeroValues) {
        return [];
    }
    
    return pts;
}

function genLinearSeriesFromKeyframes(keys, key) {
    const sorted = [...keys].sort((a, b) => toMinutes(a.t) - toMinutes(b.t));
    const pts = [];
    
    // Trova il primo punto definito
    const firstKeyframe = sorted[0];
    const firstValue = firstKeyframe ? Math.max(0, Math.min(100, Number(firstKeyframe[key] || 0))) : 0;
    
    // Prima passata: raccogli tutti i punti chiave
    const keyframes = [];
    let cur = null;
    
    for (const k of sorted) {
        const t = toMinutes(k.t);
        const newValue = Math.max(0, Math.min(100, Number(k[key] || 0)));
        
        // Se è il primo punto o il valore è diverso dal precedente, aggiungi il keyframe
        if (cur === null || newValue !== cur) {
            cur = newValue;
            keyframes.push({ x: t, y: cur });
        }
    }
    
    // Se non ci sono punti definiti, non restituire nulla
    if (keyframes.length === 0) {
        return { points: [], keyframes: [] };
    }
    
    // Trova l'ultimo 0 che precede il primo valore > 0 per questo canale
    let firstZeroTime = 0; // Default alle 00:00
    
    // Cerca il primo valore > 0 per questo canale
    for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i].y > 0) {
            // Trovato il primo valore > 0, ora cerca l'ultimo 0 che lo precede
            let lastZeroTime = 0;
            for (let j = i - 1; j >= 0; j--) {
                if (keyframes[j].y === 0) {
                    lastZeroTime = keyframes[j].x;
                    // Non fare break, continua a cercare per trovare l'ultimo 0
                }
            }
            
            // Se abbiamo trovato un 0 precedente, usalo
            if (lastZeroTime > 0) {
                firstZeroTime = lastZeroTime;
            } else {
                // Se non abbiamo trovato un 0 precedente, calcola il momento della transizione
                const prevKeyframe = keyframes[i - 1];
                const currentKeyframe = keyframes[i];
                
                // Interpola linearmente per trovare quando il valore diventa 0
                const timeDiff = currentKeyframe.x - prevKeyframe.x;
                const valueDiff = currentKeyframe.y - prevKeyframe.y;
                const ratio = (0 - prevKeyframe.y) / valueDiff;
                firstZeroTime = prevKeyframe.x + (timeDiff * ratio);
            }
            break;
        }
    }
    
    // Inizia dal primo 0 di questo canale specifico
    pts.push({ x: firstZeroTime, y: 0 });
    
    // Seconda passata: crea interpolazione lineare tra i keyframes
    for (let i = 0; i < keyframes.length; i++) {
        const current = keyframes[i];
        const next = keyframes[i + 1];
        
        // Aggiungi il punto corrente
        pts.push({ x: current.x, y: current.y });
        
        // Se c'è un punto successivo, crea interpolazione lineare
        if (next) {
            const timeDiff = next.x - current.x;
            const valueDiff = next.y - current.y;
            const steps = Math.max(1, Math.floor(timeDiff / 30)); // Un punto ogni 30 minuti per transizioni fluide
            
            for (let step = 1; step < steps; step++) {
                const progress = step / steps;
                const interpolatedTime = current.x + (timeDiff * progress);
                const interpolatedValue = current.y + (valueDiff * progress);
                pts.push({ x: interpolatedTime, y: interpolatedValue });
            }
        }
    }
    
    // Trova l'ultimo 0 che segue l'ultimo valore > 0 per questo canale
    let endTime = 24 * 60; // Default alle 24:00
    
    // Cerca l'ultimo valore > 0 per questo canale
    for (let i = keyframes.length - 1; i >= 0; i--) {
        if (keyframes[i].y > 0) {
            // Trovato l'ultimo valore > 0, ora cerca il primo 0 che lo segue
            for (let j = i + 1; j < keyframes.length; j++) {
                if (keyframes[j].y === 0) {
                    endTime = keyframes[j].x;
                    break;
                }
            }
            break;
        }
    }
    
    // Aggiungi punto finale al primo 0 successivo con l'ultimo valore
    const lastKeyframe = keyframes[keyframes.length - 1];
    pts.push({ x: endTime, y: lastKeyframe.y });
    
    const hasNonZeroValues = pts.some(p => p.y > 0);
    if (!hasNonZeroValues) {
        return { points: [], keyframes: [] };
    }
    
    return { points: pts, keyframes: keyframes };
}

function drawLinearWithFill(ctx, pts, color, width = 2, baseY, keyframes = null) {
    if (!pts.length) return;
    
    if (showFill) {
        ctx.fillStyle = color + '40';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.lineTo(pts[pts.length - 1].x, baseY);
        ctx.lineTo(pts[0].x, baseY);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    
    // Aggiungi pallini solo sui punti definiti dall'utente (keyframes)
    if (keyframes && keyframes.length > 0) {
        ctx.fillStyle = color;
        keyframes.forEach(kf => { 
            ctx.beginPath(); 
            ctx.arc(kf.x, kf.y, 2.8, 0, Math.PI * 2); 
            ctx.fill(); 
        });
    }
}

/* ==================== GESTIONE VISIBILITÀ CANALI ==================== */
function toggleChannel(channelKey) {
    visibleChannels[channelKey] = !visibleChannels[channelKey];
    
    // Aggiorna lo stile della legenda
    const legendItem = document.querySelector(`[data-channel="${channelKey}"]`);
    if (legendItem) {
        legendItem.style.opacity = visibleChannels[channelKey] ? '1' : '0.3';
    }
    
    // Ridisegna il grafico
    drawDayChart();
}

