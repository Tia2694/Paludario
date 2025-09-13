@echo off
echo ========================================
echo TROVA IP DEL PC PER ACCESSO CELLULARE
echo ========================================
echo.
echo Eseguendo ipconfig...
echo.
ipconfig | findstr "IPv4"
echo.
echo ========================================
echo ISTRUZIONI:
echo ========================================
echo 1. Avvia il server con: start-server-windows.bat
echo 2. Dal cellulare vai su: http://[IP-SOPRA]:8000
echo 3. Sostituisci [IP-SOPRA] con uno degli IP mostrati sopra
echo.
echo Esempio: http://192.168.1.100:8000
echo.
pause
