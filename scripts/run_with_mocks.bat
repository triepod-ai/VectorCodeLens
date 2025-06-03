@echo on
echo Running VectorCodeLens with mock services...
cd /d "%~dp0\.."

REM Wait for mock services to start
timeout /t 5

REM Run the check to ensure mock services are running
node scripts/check_ports.js

REM Run VectorCodeLens
echo Starting VectorCodeLens...
node dist/index.js
