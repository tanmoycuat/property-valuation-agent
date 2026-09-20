---
title: Property Valuation Agent
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
---

# Property Valuation Agent

A transparent property valuation workspace with a FastAPI backend and React/Vite client.

## Local development

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd client
npm run build
cd ..
.\.venv\Scripts\python.exe -m uvicorn server.main:app --reload --port 7860
```

Open `http://127.0.0.1:7860` after building the client.

## Configuration

- `REPLIT_TOKEN` or `HF_TOKEN`: optional Hugging Face inference token
- `MODEL_ID`: optional inference model override
- `HF_ROUTER_URL`: optional Hugging Face router URL override
- `GEOCODER_USER_AGENT`: optional identifying Nominatim user agent

The valuation engine is deterministic and does not require an inference token.
