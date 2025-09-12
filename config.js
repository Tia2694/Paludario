// File di configurazione personale
// Questo file NON viene committato su GitHub per sicurezza

const GITHUB_CONFIG = {
    username: 'Tia2694',
    repository: 'Paludario',
    branch: 'main',
    token: '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' // Il tuo token qui
};

// Esporta la configurazione
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GITHUB_CONFIG;
} else {
    window.GITHUB_CONFIG = GITHUB_CONFIG;
}
