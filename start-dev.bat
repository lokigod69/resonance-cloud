@echo off
echo Starting Resonance Orchestrator in dev mode...
echo Backend: http://localhost:8090
echo Frontend: http://localhost:5173
echo.

cd /d "%~dp0"
start "Resonance Backend" cmd /k "uv run python main.py"

cd /d "%~dp0\frontend"
start "Resonance Frontend" cmd /k "npm run dev"

echo Both servers starting...
pause
