import csv
import json
from pathlib import Path
from datetime import datetime


ROOT = Path(__file__).resolve().parents[1]

CACHE_FILES = {
    "shadnagar": ROOT / "data" / "reference" / "pass_cache.json",
    "kulasekarapattinam": ROOT / "data" / "reference" / "pass_cache_kulasekarapattinam.json",
}

OUTPUT_FILE = ROOT / "results" / "baseline_results.csv"


def parse_time(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def load_passes(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as file:
        cache = json.load(file)

    passes = []

    for norad_id, satellite_passes in cache.get("satellites", {}).items():
        for index, item in enumerate(satellite_passes):
            passes.append(
                {
                    "id": f"{norad_id}-{index}",
                    "norad_id": int(norad_id),
                    "aos": parse_time(item["aos"]),
                    "los": parse_time(item["los"]),
                    "max_el": float(item["max_el"]),
                    "az_aos": float(item["az_aos"]),
                    "az_los": float(item["az_los"]),
                    "duration_s": float(item["duration_s"]),
                    "ul_duration_s": float(item["ul_duration_s"]),
                    "ul_insufficient": bool(item["ul_insufficient"]),
                }
            )

    return passes


def fcfs_naive(passes: list[dict]) -> tuple[list[dict], list[dict]]:
    ordered = sorted(passes, key=lambda item: item["aos"])

    booked = []
    rejected = []
    last_los = None

    for current in ordered:
        if last_los is None or current["aos"] >= last_los:
            booked.append(current)
            last_los = current["los"]
        else:
            rejected.append(current)

    return booked, rejected


def earliest_los(passes: list[dict]) -> tuple[list[dict], list[dict]]:
    ordered = sorted(passes, key=lambda item: item["los"])

    booked = []
    rejected = []
    last_los = None

    for current in ordered:
        if last_los is None or current["aos"] >= last_los:
            booked.append(current)
            last_los = current["los"]
        else:
            rejected.append(current)

    return booked, rejected


def weight_greedy(passes: list[dict]) -> tuple[list[dict], list[dict]]:
    def weight(item: dict) -> float:
        return (
            item["max_el"] * 10
            + item["duration_s"]
            - item["ul_duration_s"]
        )

    ordered = sorted(passes, key=weight, reverse=True)

    booked = []
    rejected = []

    for current in ordered:
        overlaps = any(
            current["aos"] < existing["los"]
            and current["los"] > existing["aos"]
            for existing in booked
        )

        if not overlaps:
            booked.append(current)
        else:
            rejected.append(current)

    booked.sort(key=lambda item: item["aos"])

    return booked, rejected


def calculate_metrics(
    total_passes: int,
    booked: list[dict],
) -> dict:
    booked_count = len(booked)

    booking_rate = (
        100 * booked_count / total_passes
        if total_passes
        else 0.0
    )

    total_duration_s = sum(
        item["duration_s"] for item in booked
    )

    uplink_violations = sum(
        1 for item in booked
        if item["ul_insufficient"]
    )

    violation_rate = (
        100 * uplink_violations / booked_count
        if booked_count
        else 0.0
    )

    return {
        "booking_rate_pct": round(booking_rate, 2),
        "total_booked_duration_s": round(total_duration_s, 2),
        "uplink_violations": uplink_violations,
        "violation_rate_pct": round(violation_rate, 2),
    }


def run_baselines() -> None:
    rows = []

    for site, path in CACHE_FILES.items():
        passes = load_passes(path)

        baselines = [
            ("B0 FCFS-naive", fcfs_naive),
            ("B1 Earliest-LOS", earliest_los),
            ("B2 Weight-greedy", weight_greedy),
        ]

        for baseline_name, baseline_function in baselines:
            booked, rejected = baseline_function(passes)

            metrics = calculate_metrics(
                total_passes=len(passes),
                booked=booked,
            )

            print(
                f"{site} | {baseline_name} | "
                f"booked={len(booked)} | "
                f"booking_rate={metrics['booking_rate_pct']:.2f}% | "
                f"violations={metrics['uplink_violations']}"
            )

            rows.append(
                {
                    "site": site,
                    "baseline": baseline_name,
                    "total_passes": len(passes),
                    "booked": len(booked),
                    "rejected": len(rejected),
                    **metrics,
                }
            )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "site",
        "baseline",
        "total_passes",
        "booked",
        "rejected",
        "booking_rate_pct",
        "total_booked_duration_s",
        "uplink_violations",
        "violation_rate_pct",
    ]

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Saved results to: {OUTPUT_FILE}")


if __name__ == "__main__":
    run_baselines()