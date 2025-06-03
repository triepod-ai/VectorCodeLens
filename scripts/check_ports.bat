@echo on
echo Checking port availability for VectorCodeLens...
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0\.."
node scripts/check_ports.js
pause
