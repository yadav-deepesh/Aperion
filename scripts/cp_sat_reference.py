import csv
import json
from pathlib import Path
from datetime import datetime

from ortools.sat.python import cp_model


ROOT = Path(__file__).resolve().parents[1]

CACHE_FILES = {
    "shadnagar": ROOT / "data" / "reference" / "pass_cache.json",
    "kulasekarapattinam": ROOT / "data" / "reference" / "pass_cache_kulasekarapattinam.json",
}

OUTPUT_FILE = ROOT / "results" / "cp_sat_results.csv"


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def load_passes(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as file:
        cache = json.load(file)

    passes = []

    for norad_id, satellite_passes in cache.get("satellites", {}).items():
        for index, item in enumerate(satellite_passes):
            aos = parse_time(item["aos"])
            los = parse_time(item["los"])

            passes.append(
                {
                    "id": f"{norad_id}-{index}",
                    "aos": aos,
                    "los": los,
                    "start": int(aos.timestamp()),
                    "end": int(los.timestamp()),
                }
            )

    return passes


def solve_cp_sat(passes: list[dict]) -> tuple[list[dict], list[dict]]:
    model = cp_model.CpModel()

    selected = [
        model.NewBoolVar(f"pass_{index}")
        for index in range(len(passes))
    ]

    for i in range(len(passes)):
        for j in range(i + 1, len(passes)):
            first = passes[i]
            second = passes[j]

            overlaps = (
                first["start"] < second["end"]
                and second["start"] < first["end"]
            )

            if overlaps:
                model.Add(selected[i] + selected[j] <= 1)

    model.Maximize(sum(selected))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60
    solver.parameters.num_search_workers = 8

    status = solver.Solve(model)

    if status not in (
        cp_model.OPTIMAL,
        cp_model.FEASIBLE,
    ):
        raise RuntimeError("CP-SAT could not find a feasible solution")

    booked = [
        current
        for index, current in enumerate(passes)
        if solver.Value(selected[index]) == 1
    ]

    rejected = [
        current
        for index, current in enumerate(passes)
        if solver.Value(selected[index]) == 0
    ]

    booked.sort(key=lambda item: item["aos"])

    return booked, rejected


def main() -> None:
    rows = []

    for site, path in CACHE_FILES.items():
        passes = load_passes(path)
        booked, rejected = solve_cp_sat(passes)

        print(
            f"{site} | CP-SAT reference | "
            f"booked={len(booked)} | rejected={len(rejected)}"
        )

        rows.append(
            {
                "site": site,
                "baseline": "CP-SAT reference",
                "total_passes": len(passes),
                "booked": len(booked),
                "rejected": len(rejected),
                "status": "feasible_or_optimal",
            }
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "site",
                "baseline",
                "total_passes",
                "booked",
                "rejected",
                "status",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Saved results to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()