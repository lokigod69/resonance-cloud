"""Entry point for the Resonance Orchestrator."""

import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8090))
    uvicorn.run(
        "src.app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_dirs=["src"],
    )
