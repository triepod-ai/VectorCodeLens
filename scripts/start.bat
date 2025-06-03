@echo off
echo Starting VectorCodeLens with dependency checks...
cd /d "%~dp0\.."
node scripts/check-dependencies.js
pause
