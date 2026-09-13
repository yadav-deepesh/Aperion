import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from services.skyfield_svc.orbit import get_passes_for_satellite

CATALOG_FILE = Path("data/processed/catalog_50.csv")

CACHE_FILES = {
    "shadnagar": Path("data/reference/pass_cache.json"),
    "kulasekarapattinam": Path("data/reference/pass_cache_kulasekarapattinam.json"),
}


def main(site="shadnagar"):
    if site not in CACHE_FILES:
        raise ValueError(f"Unknown ground station: {site}")

    output_file = CACHE_FILES[site]
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(CATALOG_FILE, "r", encoding="utf-8") as file:
        catalog = list(csv.DictReader(file))

    cache = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "days": 7,
        "site": site,
        "satellites": {},
    }

    total = len(catalog)

    for index, satellite in enumerate(catalog, start=1):
        norad_id = satellite["NORAD_CAT_ID"]

        print(f"[{index}/{total}] Processing NORAD {norad_id} " f"for {site}...")

        passes = get_passes_for_satellite(
            norad_id,
            days=7,
            site=site,
        )

        cache["satellites"][norad_id] = passes

    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(cache, file, indent=2)

    print("\nCache warm completed successfully.")
    print(f"Site: {site}")
    print(f"Satellites cached: {len(cache['satellites'])}")
    print(f"Output: {output_file}")


if __name__ == "__main__":
    site = sys.argv[1] if len(sys.argv) > 1 else "shadnagar"
    main(site)
