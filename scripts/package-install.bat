@echo off
echo Installing additional dependencies for VectorCodeLens service...
cd /d "%~dp0\.."
npm install node-windows --save
node scripts/install-service.js
echo Service installation complete.
pause
