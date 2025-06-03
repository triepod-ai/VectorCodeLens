@echo on
echo Debugging VectorCodeLens with unhandled rejections exposed...
set PATH=C:\Program Files\nodejs;%PATH%
cd L:\source-repos\VectorCodeLens
"C:\Program Files\nodejs\node.exe" --unhandled-rejections=strict dist/index.js > debug_run.log 2>&1
