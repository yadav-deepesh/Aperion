from fastapi import FastAPI
from pydantic import BaseModel, Field
import itur

app = FastAPI(
    title="Aperion Rain Service",
    version="0.1.0",
)


class RainRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    freq_ghz: float = Field(gt=0)
    elevation_deg: float = Field(gt=0, le=90)
    hs_km: float = Field(ge=0)
    R001: float = Field(gt=0)
    p: float = Field(gt=0, le=100)
    tau: float = Field(ge=0, le=90)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/rain")
def calculate_rain(request: RainRequest) -> dict[str, float]:
    attenuation = itur.rain_attenuation(
        lat=request.lat,
        lon=request.lon,
        f=request.freq_ghz,
        el=request.elevation_deg,
        hs=request.hs_km,
        p=request.p,
        R001=request.R001,
        tau=request.tau,
    )

    return {
        "rain_attenuation_db": float(attenuation.value),
    }
