FROM python:3.12-slim

WORKDIR /app

# Build context is the repo root (set in docker-compose.yml).
# This lets us reach process-dash-core-mcp/api_client.py.

COPY process-dash-copilot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy copilot source
COPY process-dash-copilot/app ./app

# Copy api_client from the MCP package so the copilot can call the core API
# directly (Phase 3 fallback; will switch to MCP SSE sessions in Phase 4)
COPY process-dash-core-mcp/api_client.py /process-dash-core-mcp/api_client.py

ENV PORT=3200
ENV LLM_BASE_URL=http://ollama:11434/v1
ENV LLM_MODEL=llama3
ENV LLM_API_KEY=ollama
ENV CORE_API_BASE_URL=http://backend:8000/api

EXPOSE 3200

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3200"]
