@echo off
echo Iniciando o script Node.js com limite de memória aumentado...
node --max-old-space-size=4096 main.js
pause
