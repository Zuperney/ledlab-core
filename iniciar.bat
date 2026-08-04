@echo off
cd /d "%~dp0"
cls

echo.
echo  ==========================================
echo    LedLab CORE  ^|  Aplicacao (Vite + React)
echo  ==========================================
echo.
echo    A aplicacao abrira no navegador automaticamente.
echo    Neste computador:  http://localhost:5173
echo.
echo    Pra acessar do CELULAR (mesma rede Wi-Fi): use o endereco
echo    "Network:" que o Vite mostra abaixo (ex.: http://192.168.x.x:5173).
echo.
echo    Se o celular nao conectar, o Firewall do Windows esta bloqueando:
echo    na PRIMEIRA vez o Windows pergunta se permite o Node.js na rede —
echo    marque "Redes privadas" e clique Permitir. Se ja negou antes:
echo    Configuracoes ^> Firewall ^> Permitir um aplicativo ^> Node.js.
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

rem Sobe o servidor aberto pra rede local (--host) e abre o navegador.
rem "dev:lan" = vite --host (package.json) — sem isso so o localhost enxerga.
call npm run dev:lan -- --open

pause
