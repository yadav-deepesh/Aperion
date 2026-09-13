import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT_FILE = ROOT / "results" / "baseline_results.csv"


def main():
    with INPUT_FILE.open("r", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    for row in rows:
        percentage = 100 * int(row["booked"]) / int(row["total_passes"])

        print(
            f'{row["site"]} | {row["baseline"]} | '
            f'booking_rate={percentage:.2f}%'
        )


if __name__ == "__main__":
    main()