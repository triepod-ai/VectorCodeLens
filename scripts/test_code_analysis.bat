@echo off
cd /d "%~dp0\.."
node scripts/test_code_analysis.js
pause