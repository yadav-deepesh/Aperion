from pathlib import Path

import requests

from src.build_catalog import main as build_catalog
from src.deduplicate_catalog import main as deduplicate_catalog
from src.validate_catalog import validate_catalog

CELESTRAK_URL = (
    "https://celestrak.org/NORAD/elements/gp.php" "?GROUP=resource&FORMAT=csv"
)

OUTPUT_FILE = Path("data/raw/celestrak/resource.csv")
TEMP_FILE = Path("data/raw/celestrak/resource_download.csv")


def validate_and_store(input_file, output_file):
    """
    Validate a downloaded satellite catalog and store it
    only if validation succeeds.
    """

    input_file = Path(input_file)
    output_file = Path(output_file)

    print("\nValidating downloaded catalog...")

    try:
        validate_catalog(input_file)

    except Exception as error:  # noqa: BLE001 — gate: any validation failure rejects the catalog
        print("\nNew catalog rejected.")
        print("Validation failed:", error)

        if input_file.exists():
            input_file.unlink()

        return False

    output_file.parent.mkdir(parents=True, exist_ok=True)

    input_file.replace(output_file)

    print("\nNew catalog accepted.")
    print(f"Saved to: {output_file}")

    return True


def download_catalog():

    print("Downloading satellite catalog from CelesTrak...")

    try:
        response = requests.get(CELESTRAK_URL, timeout=30)
        response.raise_for_status()

    except requests.RequestException as error:
        print(f"Download failed: {error}")
        return False

    if not response.text.strip():
        print("Download failed: received empty response.")
        return False

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------
    # Save new download temporarily
    # ---------------------------------------------------------
    TEMP_FILE.write_text(response.text, encoding="utf-8")

    print("Download completed.")
    print(f"Temporary file: {TEMP_FILE}")

    # ---------------------------------------------------------
    # Validate and store catalog
    # ---------------------------------------------------------
    if not validate_and_store(TEMP_FILE, OUTPUT_FILE):
        return False

    # ---------------------------------------------------------
    # Deduplicate catalog
    # ---------------------------------------------------------
    print("\nDeduplicating catalog...")

    try:
        deduplicate_catalog()

    except Exception as error:  # noqa: BLE001 — gate: any dedup failure aborts the pipeline
        print("Deduplication failed:", error)
        return False

    # ---------------------------------------------------------
    # Build curated 50-satellite catalog
    # ---------------------------------------------------------
    print("\nBuilding 50-satellite catalog...")

    try:
        build_catalog()

    except Exception as error:  # noqa: BLE001 — gate: any catalog-build failure aborts the pipeline
        print("50-satellite catalog build failed:", error)
        return False

    print("\nIngestion pipeline completed successfully.")

    return True


if __name__ == "__main__":
    download_catalog()
