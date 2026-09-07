FROM python:3.14-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn pydantic
# Day-1 stub: returns one hardcoded window per Six_Day_Build_Plan.md:56
RUN printf '%s\n' \
  'from fastapi import FastAPI' \
  'import uvicorn' \
  'app = FastAPI()' \
  '@app.get("/health")' \
  'def health(): return {"status":"ok","service":"skyfield_svc"}' \
  '@app.get("/passes")' \
  'def passes(norad_id: int = 44804, days: int = 7):' \
  '    return [{"norad_id": norad_id, "sat":"CARTOSAT-3", "aos":"2026-09-08T02:00:00Z", "los":"2026-09-08T02:10:00Z", "max_el":42.0, "az_aos":45.0, "az_los":135.0, "duration_s":600}]' \
  'if __name__ == "__main__": uvicorn.run(app, host="0.0.0.0", port=50052)' > app.py
EXPOSE 50052
HEALTHCHECK --interval=5s --timeout=3s --retries=10 --start-period=10s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:50052/health', timeout=2).read()"
CMD ["python", "app.py"]
