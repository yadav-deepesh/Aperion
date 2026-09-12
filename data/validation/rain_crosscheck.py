import csv
from pathlib import Path

import itur
import yaml


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "data" / "validation"
TOLERANCE_FILE = ROOT / "config" / "tolerances.yaml"


TEST_CASES = [
    {
        "case": "hyderabad_26ghz",
        "lat": 17.03,
        "lon": 78.18,
        "freq_ghz": 26.0,
        "elevation_deg": 30.0,
        "hs_km": 0.54,
        "R001": 65.0,
        "p": 0.01,
        "tau": 45.0,
    },
    {
        "case": "london_reference",
        "lat": 51.5,
        "lon": -0.14,
        "freq_ghz": 14.25,
        "elevation_deg": 31.07699124,
        "hs_km": 0.031382984,
        "R001": 26.48052,
        "p": 1.0,
        "tau": 0.0,
    },
]


def main() -> None:
    with TOLERANCE_FILE.open(encoding="utf-8") as file:
        tolerance = yaml.safe_load(file)["rain_crosscheck_absolute_db"]

    rust_rows = {
        row["case"]: row
        for row in csv.DictReader(
            (OUTPUT_DIR / "rust_rain_output.csv").open(
                encoding="utf-8", newline=""
            )
        )
    }

    comparison_rows = []

    for case in TEST_CASES:
        python_result = itur.rain_attenuation(
            lat=case["lat"],
            lon=case["lon"],
            f=case["freq_ghz"],
            el=case["elevation_deg"],
            hs=case["hs_km"],
            p=case["p"],
            R001=case["R001"],
            tau=case["tau"],
        )

        python_db = float(python_result.value)
        rust_db = float(rust_rows[case["case"]]["rust_rain_db"])
        difference = abs(python_db - rust_db)

        comparison_rows.append(
            {
                "case": case["case"],
                "python_rain_db": python_db,
                "rust_rain_db": rust_db,
                "absolute_difference_db": difference,
                "tolerance_db": tolerance,
                "passed": difference <= tolerance,
            }
        )

    output_path = OUTPUT_DIR / "rain_crosscheck_comparison.csv"

    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=comparison_rows[0].keys(),
        )
        writer.writeheader()
        writer.writerows(comparison_rows)

    failed = [row for row in comparison_rows if not row["passed"]]

    print(f"Wrote comparison results to {output_path}")
    print(f"Tolerance: {tolerance} dB")
    print(f"Cases checked: {len(comparison_rows)}")
    print(f"Passed: {len(comparison_rows) - len(failed)}")
    print(f"Failed: {len(failed)}")

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
