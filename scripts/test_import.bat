@echo on
echo Testing VectorCodeLens module imports...
cd /d "%~dp0\.."
node scripts/test_import.js
type test_import.log
