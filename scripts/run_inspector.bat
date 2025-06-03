@echo on
echo Starting MCP Inspector...
set PATH=C:\Program Files\nodejs;%PATH%
echo Node.js path set to: C:\Program Files\nodejs
echo Current directory: %CD%
dir dist
npx -y @modelcontextprotocol/inspector node dist/index.js
pause
