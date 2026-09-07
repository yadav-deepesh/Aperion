FROM python:3.14-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn pydantic
RUN printf '%s\n' \
  'from fastapi import FastAPI' \
  'from pydantic import BaseModel' \
  'import uvicorn' \
  'app = FastAPI()' \
  'class RainReq(BaseModel): lat: float = 17.03; lon: float = 78.18; freq_ghz: float = 26.0; elevation_deg: float = 45.0; hs_km: float = 0.54; p: float = 0.01; r001_mmh: float = 65.0' \
  '@app.get("/health")' \
  'def health(): return {"status":"ok","service":"rain_svc"}' \
  '@app.post("/rain")' \
  'def rain(req: RainReq): return {"attenuation_db": 2.5}' \
  '@app.get("/rain")' \
  'def rain_get(): return {"attenuation_db": 2.5}' \
  'if __name__ == "__main__": uvicorn.run(app, host="0.0.0.0", port=50053)' > app.py
EXPOSE 50053
HEALTHCHECK --interval=5s --timeout=3s --retries=10 --start-period=10s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:50053/health', timeout=2).read()"
CMD ["python", "app.py"]
