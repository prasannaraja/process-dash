FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy copilot source
COPY . .

# Also copy the MCP server's api_client so we can call the core API directly
# (Phase 3 fallback — Phase 4 will use proper MCP SSE sessions)
COPY ../process-dash-core-mcp/api_client.py /process-dash-core-mcp/api_client.py

ENV PORT=3200
ENV LLM_BASE_URL=http://ollama:11434/v1
ENV LLM_MODEL=llama3
ENV LLM_API_KEY=ollama
ENV CORE_API_BASE_URL=http://backend:8000/api

EXPOSE 3200

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3200"]
