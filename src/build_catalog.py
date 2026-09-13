import pandas as pd

SOURCE_FILE = "data/processed/resource_deduplicated.csv"
EXISTING_CATALOG = "data/processed/catalog_50.csv"
OUTPUT_FILE = "data/processed/catalog_50.csv"


def main():

    source = pd.read_csv(SOURCE_FILE)
    existing_catalog = pd.read_csv(EXISTING_CATALOG)

    selected_norad = existing_catalog["NORAD_CAT_ID"].astype(int)

    catalog = source[
        source["NORAD_CAT_ID"].isin(selected_norad)
    ].copy()

    catalog = catalog.sort_values("NORAD_CAT_ID")

    catalog.to_csv(OUTPUT_FILE, index=False)

    print("Full catalog:", len(source))
    print("Selected satellites:", len(selected_norad))
    print("Final catalog:", len(catalog))
    print("Output:", OUTPUT_FILE)

    missing = set(selected_norad) - set(catalog["NORAD_CAT_ID"])

    if missing:
        print("WARNING: Missing NORAD IDs:", sorted(missing))
    else:
        print("All selected NORAD IDs resolved: PASSED")


if __name__ == "__main__":
    main()