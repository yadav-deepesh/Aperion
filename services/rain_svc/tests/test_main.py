from fastapi.testclient import TestClient

from rain_svc.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_rain_calculation():
    response = client.post(
        "/rain",
        json={
            "lat": 17.03,
            "lon": 78.18,
            "freq_ghz": 26.0,
            "elevation_deg": 30.0,
            "hs_km": 0.54,
            "R001": 65.0,
            "p": 0.01,
            "tau": 45.0,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert "rain_attenuation_db" in data
    assert data["rain_attenuation_db"] > 0


def test_invalid_latitude():
    response = client.post(
        "/rain",
        json={
            "lat": 200.0,
            "lon": 78.18,
            "freq_ghz": 26.0,
            "elevation_deg": 30.0,
            "hs_km": 0.54,
            "R001": 65.0,
            "p": 0.01,
            "tau": 45.0,
        },
    )

    assert response.status_code == 422
