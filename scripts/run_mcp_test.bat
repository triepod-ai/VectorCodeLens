@echo on
echo Starting VectorCodeLens MCP Test...
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0\.."
node scripts/mcp_test.js
pause
