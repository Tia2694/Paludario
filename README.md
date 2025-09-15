# 🌱 Paludario - Gestione Completa Paludario

Un'applicazione web PWA per la gestione completa del tuo paludario, con sincronizzazione dati multi-dispositivo tramite GitHub.

## ✨ Caratteristiche

- **💧 Gestione Valori Acqua**: pH, KH, GH, NO2, NO3, NH4, temperatura, conducibilità
- **⏰ Programmazione Giornaliera**: Luci RGBW, spray pioggia, ventola deumidificante
- **📊 Grafici Interattivi**: Visualizzazione trend e profili giornalieri
- **🌙 Dark Mode**: Interfaccia adattiva giorno/notte
- **📱 PWA**: Installabile su dispositivi mobili
- **☁️ Sincronizzazione Cloud**: Dati salvati su GitHub, accessibili da qualsiasi dispositivo
- **🔄 Backup Automatico**: Salvataggio locale e cloud

## 🚀 Installazione

### 1. Configurazione GitHub

1. Crea un nuovo repository su GitHub chiamato `Paludario`
2. Abilita GitHub Pages nelle impostazioni del repository
3. Genera un Personal Access Token con permessi `repo`

### 2. Configurazione Applicazione

1. Modifica il file `paludario-app.js`
2. Sostituisci i valori in `GITHUB_CONFIG`:
   ```javascript
   const GITHUB_CONFIG = {
       username: 'TUO_USERNAME_GITHUB',
       repository: 'Paludario',
       branch: 'main',
       token: 'TUO_TOKEN_GITHUB'
   };
   ```

### 3. Deploy

1. Carica tutti i file nel repository GitHub
2. L'applicazione sarà disponibile su `https://TUO_USERNAME.github.io/Paludario`

## 📁 Struttura File

```
paludario_GitHub/
├── index.html              # Pagina principale
├── paludario-app.js        # Gestione dati e sincronizzazione
├── paludario-functions.js  # Funzioni applicazione
├── paludario-charts.js     # Grafici e visualizzazioni
├── data/                   # Cartella dati (creata automaticamente)
│   ├── water.json         # Valori acqua
│   ├── dayTemplate.json   # Programmazione giornaliera
│   └── settings.json      # Impostazioni utente
└── README.md              # Questo file
```

## 🔧 Utilizzo

### Valori Acqua
- Inserisci i parametri dell'acqua con data/ora
- Visualizza grafici dei trend
- Modifica o elimina valori esistenti

### Programmazione Giornaliera
- **Luci**: Imposta intensità RGBW + plafoniera per ogni ora
- **Spray Pioggia**: Definisci intervalli di attivazione
- **Ventola**: Programma la deumidificazione

### Sincronizzazione
- I dati vengono salvati automaticamente su GitHub
- Accesso da qualsiasi dispositivo connesso
- Backup locale come fallback

## 🛠️ Sviluppo

### Struttura Dati

**Valori Acqua** (`data/water.json`):
```json
[
  {
    "id": "unique_id",
    "ts": "2024-01-01T10:00:00",
    "ph": 7.2,
    "kh": 4.0,
    "gh": 6.0,
    "no2": 0.0,
    "no3": 5.0,
    "nh4": 0.0,
    "temp": 24.5,
    "cond": 300
  }
]
```

**Programmazione Giornaliera** (`data/dayTemplate.json`):
```json
{
  "spray": [{"s": "08:00", "e": "08:15"}],
  "fan": [{"s": "10:00", "e": "12:00"}],
  "lights": [
    {
      "t": "08:00",
      "ch1": 50
    },
    {
      "t": "08:00", 
      "ch2": 30
    },
    {
      "t": "08:00",
      "ch3": 20
    },
    {
      "t": "08:00",
      "ch4": 40
    },
    {
      "t": "08:00",
      "ch5": 60
    }
  ]
}
```

## 🔒 Sicurezza

- I dati sono privati nel tuo repository GitHub
- Token di accesso necessario per modifiche
- Backup locale per continuità del servizio

## 📱 PWA

L'applicazione è una Progressive Web App:
- Installabile su dispositivi mobili
- Funziona offline (con dati locali)
- Sincronizzazione automatica quando online

## 🐛 Risoluzione Problemi

### Errore di Sincronizzazione
1. Verifica che il token GitHub sia valido
2. Controlla i permessi del repository
3. Usa il pulsante "Sincronizza Dati" per forzare il refresh

### Dati Non Aggiornati
1. Ricarica la pagina
2. Controlla la connessione internet
3. Verifica lo stato di sincronizzazione nell'indicatore in alto a sinistra

## 📄 Licenza

Questo progetto è open source. Sentiti libero di modificarlo per le tue esigenze.

## 🤝 Contributi

Contributi e suggerimenti sono benvenuti! Apri una issue o una pull request.

---

**Buona gestione del tuo paludario! 🌱🐸**
