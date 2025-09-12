# 🚀 Guida al Deploy su GitHub

## Passo 1: Preparazione Repository

1. **Crea un nuovo repository su GitHub:**
   - Vai su [github.com/new](https://github.com/new)
   - Nome: `Paludario`
   - Descrizione: `Gestione completa del paludario`
   - Pubblica come repository pubblico o privato

2. **Abilita GitHub Pages:**
   - Vai su Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` (o `master`)
   - Folder: `/ (root)`
   - Salva

## Passo 2: Genera Token GitHub

1. **Vai su GitHub Settings:**
   - [github.com/settings/tokens](https://github.com/settings/tokens)
   - Click "Generate new token" → "Generate new token (classic)"

2. **Configura il token:**
   - Note: `Paludario App`
   - Expiration: `No expiration` (o scegli una data)
   - Scopes: ✅ `repo` (Full control of private repositories)

3. **Copia il token generato** (lo userai nel passo 4)

## Passo 3: Upload File

### Opzione A: GitHub Web Interface
1. Vai nel tuo repository
2. Click "Add file" → "Upload files"
3. Trascina tutti i file dalla cartella `paludario_GitHub/`
4. Commit message: `Initial commit - Paludario PWA`
5. Click "Commit changes"

### Opzione B: Git Command Line
```bash
# Clona il repository
git clone https://github.com/TUO_USERNAME/Paludario.git
cd Paludario

# Copia i file
cp -r paludario_GitHub/* .

# Commit e push
git add .
git commit -m "Initial commit - Paludario PWA"
git push origin main
```

## Passo 4: Configurazione App

1. **Modifica `paludario-app.js`:**
   ```javascript
   const GITHUB_CONFIG = {
       username: 'TUO_USERNAME_GITHUB',  // Il tuo username
       repository: 'Paludario',
       branch: 'main',
       token: 'ghp_xxxxxxxxxxxxxxxxxxxx'  // Il token del passo 2
   };
   ```

2. **Salva e committa le modifiche:**
   ```bash
   git add paludario-app.js
   git commit -m "Configure GitHub API"
   git push origin main
   ```

## Passo 5: Test

1. **Vai alla tua app:**
   - URL: `https://TUO_USERNAME.github.io/Paludario`
   - Dovrebbe caricare l'applicazione

2. **Testa la sincronizzazione:**
   - Aggiungi un valore acqua
   - Verifica che appaia l'indicatore di sincronizzazione
   - Controlla che i dati siano salvati nel repository

## 🔧 Risoluzione Problemi

### Errore 404
- Verifica che GitHub Pages sia abilitato
- Controlla che il branch sia corretto
- Aspetta qualche minuto per la propagazione

### Errore di Sincronizzazione
- Verifica che il token abbia i permessi `repo`
- Controlla che username e repository siano corretti
- Verifica che il branch esista

### Dati Non Salvati
- Controlla la console del browser per errori
- Verifica la connessione internet
- Usa il pulsante "Sincronizza Dati"

## 📱 Installazione PWA

1. **Su Desktop:**
   - Apri l'app in Chrome/Edge
   - Click sull'icona "Installa" nella barra degli indirizzi

2. **Su Mobile:**
   - Apri l'app in Safari/Chrome
   - Menu → "Aggiungi alla schermata Home"

## 🔄 Aggiornamenti

Per aggiornare l'app:
1. Modifica i file localmente
2. Committa e pusha le modifiche
3. L'app si aggiorna automaticamente

## 📊 Monitoraggio

- **GitHub Insights:** Vedi le statistiche del repository
- **GitHub Actions:** Monitora i deploy automatici
- **Browser DevTools:** Debug dell'applicazione

---

**🎉 La tua app Paludario è ora online e sincronizzata!**
