@echo off
echo Iniciando Servidor Local y Frontend en esta misma ventana...

:: Ejecutar Backend en segundo plano pero en la misma ventana
start /B cmd /c "node server/index.js"

:: Ejecutar Frontend en segundo plano pero en la misma ventana
start /B cmd /c "npm run dev"

echo.
echo Los servidores estan arrancando...
echo Esperando unos segundos antes de abrir el navegador...
timeout /t 4 /nobreak >nul

start http://localhost:5173
echo.
echo =======================================================
echo [SISTEMA ACTIVO] NO CIERRES ESTA VENTANA NEGRA
echo Si la cierras, el sistema dejara de funcionar.
echo =======================================================
:: El comando pause mantiene la ventana principal abierta
pause
