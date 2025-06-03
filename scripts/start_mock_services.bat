@echo on
echo Starting mock services for VectorCodeLens...
cd /d "%~dp0\.."
node scripts/mock_services.js
