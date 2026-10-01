FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000 CYCLONE_PLANNING_DB=/data/planning.sqlite3
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements-research.txt ./
RUN pip install --no-cache-dir -r requirements-research.txt
RUN useradd --create-home cyclone && mkdir /data && chown cyclone:cyclone /data
COPY --chown=cyclone:cyclone *.py ./
COPY --chown=cyclone:cyclone research_data/ ./research_data/
USER cyclone
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn compatibility_api:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
