@echo on
echo Running VectorCodeLens Diagnostics...
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0\.."
node scripts/diagnose.js
type vectorcodelens-diagnosis.log
pause
