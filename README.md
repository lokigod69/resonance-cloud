# Resonance Orchestrator

The DAW interface for the Resonance content generation pipeline.

## Quick Start

**Production** (frontend served by backend):
```
start.bat
```
Open http://localhost:8090

**Development** (hot reload):
```
start-dev.bat
```
Backend: http://localhost:8090 | Frontend: http://localhost:5173

## Setup

```bash
uv sync                          # install Python deps
cd frontend && npm install       # install JS deps
cd frontend && npm run build     # build React app
uv run python main.py            # start server
```

## Architecture

- Backend: FastAPI (src/) on port 8090
- Frontend: Vite + React + Tailwind (frontend/)
- Workspace: D:/CODING/ResonanceWorkspace/workspace/

## Engines

| Engine   | Port | Endpoint  |
|----------|------|-----------|
| Concept  | 8080 | POST /run |
| Song     | 8000 | POST /run |
| Image    | 8082 | POST /run |
| Video    | 8086 | POST /run |
| Assembly | 8085 | POST /run |

## CSV Format

Required: word, translation, language
Optional: pos, ipa, example, example_gloss, synonyms, etymology, mnemonic, tags

See sample_words.csv for an example.
