from pathlib import Path
import csv

ROOT = Path(__file__).resolve().parents[1]

baseline_path = ROOT / "results" / "baseline_results.csv"
cp_sat_path = ROOT / "results" / "cp_sat_results.csv"
output_path = ROOT / "results" / "evaluation_summary.csv"

with baseline_path.open("r", newline="", encoding="utf-8") as f:
    baseline_rows = list(csv.DictReader(f))

with cp_sat_path.open("r", newline="", encoding="utf-8") as f:
    cp_sat_rows = list(csv.DictReader(f))

cp_sat_booked = {row["site"]: int(row["booked"]) for row in cp_sat_rows}

summary_rows = []

for row in baseline_rows:
    site = row["site"]
    baseline = row["baseline"]
    booked = int(row["booked"])
    optimal_booked = cp_sat_booked[site]

    optimality_gap_pct = (
        (optimal_booked - booked) / optimal_booked * 100 if optimal_booked > 0 else 0.0
    )

    summary_rows.append(
        {
            **row,
            "cp_sat_booked": optimal_booked,
            "optimality_gap_pct": round(optimality_gap_pct, 2),
        }
    )

fieldnames = list(summary_rows[0].keys())

with output_path.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(summary_rows)

print(f"Saved evaluation summary to: {output_path}")

for row in summary_rows:
    print(
        f'{row["site"]} | {row["baseline"]} | '
        f'booked={row["booked"]} | '
        f'CP-SAT={row["cp_sat_booked"]} | '
        f'gap={row["optimality_gap_pct"]:.2f}%'
    )
