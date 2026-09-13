import pandas as pd

INPUT_FILE = "data/raw/celestrak/resource.csv"
OUTPUT_FILE = "data/processed/resource_deduplicated.csv"


def main():

    df = pd.read_csv(INPUT_FILE)

    print("Original records:", len(df))

    # Keep the original EPOCH string unchanged.
    # Use a temporary column only for datetime validation/sorting.
    df["_EPOCH_DATETIME"] = pd.to_datetime(
        df["EPOCH"],
        errors="raise"
    )

    # Sort using the temporary datetime column.
    df = df.sort_values(
        ["NORAD_CAT_ID", "_EPOCH_DATETIME"]
    )

    before = len(df)

    df = df.drop_duplicates(
        subset=["NORAD_CAT_ID", "EPOCH"],
        keep="last"
    )

    duplicates_removed = before - len(df)

    # Remove the temporary column before saving.
    df = df.drop(
        columns=["_EPOCH_DATETIME"]
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("Duplicates removed:", duplicates_removed)
    print("Records after deduplication:", len(df))
    print("Output:", OUTPUT_FILE)


if __name__ == "__main__":
    main()
