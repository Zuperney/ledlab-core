@echo off
cd /d "%~dp0"
cls

echo.
echo  ==========================================
echo    LedLab CORE  ^|  Aplicacao (Vite + React)
echo  ==========================================
echo.
echo    A aplicacao abrira no navegador automaticamente.
echo    Endereco: http://localhost:5173
echo.
echo    Para parar: feche esta janela ou pressione Ctrl+C.
echo.

rem Primeira execucao: instala dependencias se a pasta node_modules nao existir.
if not exist "node_modules" (
  echo  Instalando dependencias pela primeira vez, aguarde...
  echo.
  call npm install
  echo.
)

rem Sobe o servidor de desenvolvimento e abre o navegador quando estiver pronto.
call npm run dev -- --open

pause
