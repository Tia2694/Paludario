// File di configurazione di esempio
// Copia questo file come config.js e inserisci i tuoi dati

const GITHUB_CONFIG = {
    // Sostituisci con il tuo username GitHub
    username: 'TUO_USERNAME_GITHUB',
    
    // Nome del repository (di solito 'Paludario')
    repository: 'Paludario',
    
    // Branch principale (di solito 'main' o 'master')
    branch: 'main',
    
    // Token GitHub con permessi repo
    // Genera qui: https://github.com/settings/tokens
    token: 'TUO_TOKEN_GITHUB'
};

// Esporta la configurazione
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GITHUB_CONFIG;
} else {
    window.GITHUB_CONFIG = GITHUB_CONFIG;
}
