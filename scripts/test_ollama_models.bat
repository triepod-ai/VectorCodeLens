@echo off
cd /d "%~dp0\.."
node scripts/test_ollama_models.js
pause