// File di configurazione personale
// Questo file NON viene committato su GitHub per sicurezza

// Configurazione di base (sempre presente)
const GITHUB_CONFIG = {
    username: 'Tia2694',
    repository: 'Paludario',
    branch: 'main',
    token: null // Sarà caricato dinamicamente
};

// Carica il token dal localStorage o prompt all'utente
function loadGitHubToken() {
    // Prima prova a caricare dal localStorage
    const savedToken = localStorage.getItem('paludario.githubToken');
    if (savedToken && savedToken.length > 0) {
        GITHUB_CONFIG.token = savedToken;
        return true;
    }
    
    // Se non c'è, chiedi all'utente
    const token = prompt('🔐 Inserisci il tuo GitHub Personal Access Token:\n\n' +
        '1. Vai su GitHub → Settings → Developer settings → Personal access tokens\n' +
        '2. Genera un nuovo token con permessi "repo"\n' +
        '3. Incollalo qui\n\n' +
        'Il token verrà salvato localmente su questo dispositivo.');
    
    if (token && token.length > 0) {
        GITHUB_CONFIG.token = token;
        localStorage.setItem('paludario.githubToken', token);
        return true;
    }
    
    return false;
}

// Funzione per verificare se il token è valido
async function validateGitHubToken() {
    if (!GITHUB_CONFIG.token) return false;
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}`, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Errore validazione token:', error);
        return false;
    }
}

// Inizializza la configurazione
async function initializeGitHubConfig() {
    if (loadGitHubToken()) {
        const isValid = await validateGitHubToken();
        if (!isValid) {
            console.warn('Token GitHub non valido, rimuovo dal localStorage');
            localStorage.removeItem('paludario.githubToken');
            GITHUB_CONFIG.token = null;
            return false;
        }
        return true;
    }
    return false;
}

// Esporta la configurazione
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GITHUB_CONFIG, initializeGitHubConfig, validateGitHubToken };
} else {
    window.GITHUB_CONFIG = GITHUB_CONFIG;
    window.initializeGitHubConfig = initializeGitHubConfig;
    window.validateGitHubToken = validateGitHubToken;
}
