# 📱 Istruzioni per Accesso da Cellulare

## 🚀 Setup Rapido

### 1. Trova l'IP del PC
- **Esegui**: `find-ip.bat` (doppio clic)
- **Oppure**: Apri terminale e digita `ipconfig`
- **Cerca**: "IPv4" nella lista

### 2. Avvia il Server
- **Esegui**: `start-server-windows.bat` (doppio clic)
- **Verifica**: Che appaia "Serving HTTP on 0.0.0.0 port 8000"

### 3. Testa la Connessione
- **Dal PC**: http://localhost:8000/test-connection.html
- **Dal cellulare**: http://[IP-DEL-PC]:8000/test-connection.html

## 📱 Accesso da Cellulare

### URL da usare:
```
http://[IP-DEL-PC]:8000
```

**Esempi:**
- `http://192.168.1.100:8000`
- `http://192.168.0.50:8000`
- `http://10.0.0.5:8000`

### Passi:
1. **Apri il browser** sul cellulare
2. **Digita l'URL** con l'IP del tuo PC
3. **Premi Invio**
4. **Dovrebbe caricare** l'applicazione Paludario

## 🔧 Risoluzione Problemi

### ❌ "Impossibile raggiungere il sito"
**Cause possibili:**
- Server non avviato
- IP sbagliato
- Firewall che blocca la connessione

**Soluzioni:**
1. Verifica che il server sia attivo
2. Controlla l'IP con `find-ip.bat`
3. Disabilita temporaneamente il firewall Windows

### ❌ "Connessione rifiutata"
**Cause possibili:**
- Porta 8000 bloccata
- Server non configurato per connessioni esterne

**Soluzioni:**
1. Usa `start-server-windows.bat` (non il comando Python diretto)
2. Verifica che il server mostri "0.0.0.0" e non "127.0.0.1"

### ❌ "Dati non si sincronizzano"
**Cause possibili:**
- Problemi di rete
- Token GitHub scaduto
- CORS del browser

**Soluzioni:**
1. Usa il pulsante "🐛 Debug" per diagnosticare
2. Controlla la console del browser per errori
3. Verifica la connessione internet

## 🌐 Test di Connessione

### Test 1: Connessione Base
- Vai su `http://[IP]:8000/test-connection.html`
- Clicca "Test Connessione"
- Dovrebbe mostrare "✅ Connessione server OK"

### Test 2: Caricamento Dati
- Clicca "Test Caricamento Dati"
- Dovrebbe mostrare i file JSON caricati

### Test 3: Sincronizzazione
- Clicca "Test Sincronizzazione"
- Dovrebbe mostrare "✅ Sincronizzazione OK"

## 📊 Sincronizzazione Multi-dispositivo

### Come funziona:
1. **Modifica i dati** su un dispositivo
2. **Aspetta** la sincronizzazione automatica (indicatore verde)
3. **Sull'altro dispositivo**, clicca "🔄 GitHub"
4. **I dati si aggiornano** automaticamente

### Test completo:
1. **PC**: Modifica i litri a "25"
2. **Cellulare**: Clicca "🔄 GitHub"
3. **Verifica**: Che i litri mostrino "25"

## 🔒 Sicurezza

- **Rete locale**: L'accesso è limitato alla rete locale
- **Nessun accesso esterno**: Non è accessibile da internet
- **Dati privati**: I dati rimangono nel tuo repository GitHub

## 📞 Supporto

Se hai problemi:
1. Controlla i log nella console del browser (F12)
2. Usa il pulsante "🐛 Debug" nell'app
3. Verifica che entrambi i dispositivi siano sulla stessa rete WiFi
