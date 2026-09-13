import hashlib
import logging
from datetime import datetime
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.ingest_data import download_catalog
from scripts.cache_warm import main as warm_cache

LOG_DIR = Path("outputs/logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)

log_file = LOG_DIR / f"refresh_{datetime.now():%Y%m%d_%H%M%S}.log"

logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


RESOURCE_FILE = Path("data/raw/celestrak/resource.csv")
CHECKSUM_FILE = Path("SHA256SUMS")


def update_checksum():
    sha256 = hashlib.sha256()

    with open(RESOURCE_FILE, "rb") as file:
        for chunk in iter(lambda: file.read(8192), b""):
            sha256.update(chunk)

    checksum = sha256.hexdigest().upper()

    CHECKSUM_FILE.write_text(
        f"SHA256  data/raw/celestrak/resource.csv  {checksum}\n",
        encoding="utf-8",
    )

    logging.info("SHA256 checksum updated: %s", checksum)
    print("SHA256 checksum updated:", checksum)


def main():
    logging.info("Starting catalog refresh...")

    try:
        success = download_catalog()

        if not success:
            logging.error("Catalog refresh failed.")
            return 1

        logging.info("Catalog refresh completed successfully.")

        update_checksum()

        logging.info("Starting pass cache warm for Shadnagar...")
        warm_cache("shadnagar")
        logging.info("Shadnagar pass cache warm completed successfully.")

        logging.info("Starting pass cache warm for Kulasekarapattinam...")
        warm_cache("kulasekarapattinam")
        logging.info("Kulasekarapattinam pass cache warm completed successfully.")

        return 0

    except Exception as error:
        logging.exception("Unexpected error during refresh: %s", error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
