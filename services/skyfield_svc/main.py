from fastapi import FastAPI, HTTPException

from services.skyfield_svc.cache import load_pass_cache
from services.skyfield_svc.orbit import get_passes_for_satellite

app = FastAPI(title="Aperion Skyfield Orbit Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/passes")
def get_passes(
    norad_id: str,
    days: int = 7,
    site: str = "shadnagar",
):

    if days < 1 or days > 7:
        raise HTTPException(status_code=400, detail="days must be between 1 and 7")

    # Try the cache for the requested site.
    try:
        cache = load_pass_cache(site)

        if norad_id in cache["satellites"]:
            passes = cache["satellites"][norad_id]

            # Cache contains 7 days of passes.
            # Keep only passes that begin within the requested period.
            if days < cache["days"]:
                from datetime import datetime, timedelta

                cache_generated = datetime.fromisoformat(
                    cache["generated_at"].replace("Z", "+00:00")
                )

                cutoff = cache_generated + timedelta(days=days)

                filtered_passes = []

                for satellite_pass in passes:
                    aos = datetime.fromisoformat(
                        satellite_pass["aos"].replace("Z", "+00:00")
                    )

                    if aos <= cutoff:
                        filtered_passes.append(satellite_pass)

                passes = filtered_passes

            return {
                "norad_id": norad_id,
                "days": days,
                "site": site,
                "passes": passes,
            }

    except FileNotFoundError:
        pass

    # If the requested site's cache is unavailable,
    # calculate passes using live Skyfield.
    passes = get_passes_for_satellite(
        norad_id,
        days,
        site,
    )

    if not passes:
        raise HTTPException(
            status_code=404,
            detail=f"No satellite found or no passes for NORAD {norad_id}",
        )

    return {
        "norad_id": norad_id,
        "days": days,
        "site": site,
        "passes": passes,
    }
