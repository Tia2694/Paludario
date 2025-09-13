@echo off
echo Avvio server web per Paludario...
echo.
echo Se Python non e' installato, scarica da: https://www.python.org/downloads/
echo.
cd /d "%~dp0"
echo Directory corrente: %CD%
echo.
echo Avvio server su porta 8000 (accessibile da altri dispositivi)...
echo.
echo URL per PC: http://localhost:8000
echo URL per cellulare: http://[IP-DEL-PC]:8000
echo.
echo Per trovare l'IP del PC, esegui: ipconfig
echo.
echo Premi Ctrl+C per fermare il server
echo.
python -m http.server 8000 --bind 0.0.0.0
pause
