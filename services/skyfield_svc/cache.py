import json
from pathlib import Path

CACHE_FILES = {
    "shadnagar": Path("data/reference/pass_cache.json"),
    "kulasekarapattinam": Path("data/reference/pass_cache_kulasekarapattinam.json"),
}


def load_pass_cache(site="shadnagar"):
    if site not in CACHE_FILES:
        raise ValueError(f"Unknown ground station: {site}")

    cache_file = CACHE_FILES[site]

    if not cache_file.exists():
        raise FileNotFoundError(f"Pass cache not found: {cache_file}")

    with open(cache_file, "r", encoding="utf-8") as file:
        cache = json.load(file)

    return cache


if __name__ == "__main__":
    cache = load_pass_cache()

    print("Offline cache loaded successfully.")
    print("Site:", cache.get("site", "shadnagar"))
    print("Generated at:", cache["generated_at"])
    print("Days:", cache["days"])
    print("Satellites:", len(cache["satellites"]))
