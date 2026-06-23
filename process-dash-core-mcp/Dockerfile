FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=3100
ENV CORE_API_BASE_URL=http://backend:8000/api

EXPOSE 3100

CMD ["python", "server.py", "--transport", "sse"]
