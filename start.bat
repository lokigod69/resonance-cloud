@echo off
cd /d "%~dp0"
echo Starting Resonance Orchestrator on port 8090...
uv run python main.py
