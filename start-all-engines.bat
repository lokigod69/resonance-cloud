@echo off
REM ─── Resonance: Start All Engines ─────────────────────────────────
REM NOTE: Ace-Step (port 7860) must be started manually before the
REM Song Engine will work. Song Engine depends on it for music generation.
REM ────────────────────────────────────────────────────────────────────

echo Starting all Resonance engines...
echo.

REM Concept Engine (port 8080)
start cmd /k "title Concept Engine (8080) && cd /d D:\CODING\ResonanceTEST\engines\concept-engine && call start-ui.bat"

REM Song Engine (port 8000) — no bat file, run directly
start cmd /k "title Song Engine (8000) && cd /d D:\CODING\ResonanceTEST\engines\song-engine && .venv\Scripts\uvicorn ui.app:app --port 8000"

REM Image Engine (port 8082)
start cmd /k "title Image Engine (8082) && cd /d D:\CODING\ResonanceTEST\engines\image-engine && call start-ui.bat"

REM Video Engine (port 8086)
start cmd /k "title Video Engine (8086) && cd /d D:\CODING\ResonanceTEST\engines\video-engine && call start-ui.bat"

REM Assembly Engine (port 8085)
start cmd /k "title Assembly Engine (8085) && cd /d D:\CODING\ResonanceTEST\engines\assembly-engine && call start-ui.bat"

echo.
echo All engines starting in separate windows.
echo Waiting 3 seconds before starting the orchestrator...
timeout /t 3 /nobreak >nul

REM Start the orchestrator itself
echo Starting Resonance Orchestrator (port 8090)...
call start.bat
