@echo on
echo Testing VectorCodeLens Dependencies...
cd /d "%~dp0\.."
mkdir logs 2>nul
node scripts/check-dependencies.js > logs/vectorcodelens-check.log 2>&1
type logs/vectorcodelens-check.log
pause
