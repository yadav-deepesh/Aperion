import pandas as pd
import pandera.pandas as pa

schema = pa.DataFrameSchema(
    {
        "OBJECT_NAME": pa.Column(str, nullable=False),
        "NORAD_CAT_ID": pa.Column(int, pa.Check.greater_than(0), nullable=False),
        "EPOCH": pa.Column(str, nullable=False),
        "MEAN_MOTION": pa.Column(float, pa.Check.greater_than(0), nullable=False),
        "ECCENTRICITY": pa.Column(
            float,
            [
                pa.Check.greater_than_or_equal_to(0),
                pa.Check.less_than(1),
            ],
            nullable=False,
        ),
        "INCLINATION": pa.Column(
            float,
            [
                pa.Check.greater_than_or_equal_to(0),
                pa.Check.less_than_or_equal_to(180),
            ],
            nullable=False,
        ),
    },
    strict=False,
)


def validate_catalog(file_path):

    df = pd.read_csv(file_path)

    print("Catalog loaded successfully.")
    print("File:", file_path)
    print("Total satellites:", len(df))

    # Validate EPOCH separately because it is stored as text
    pd.to_datetime(df["EPOCH"], errors="raise")

    schema.validate(df)

    print("Pandera validation: PASSED")
    print("EPOCH validation: PASSED")

    print("\nCatalog quality summary:")

    print("Unique NORAD IDs:", df["NORAD_CAT_ID"].nunique())

    print("Duplicate NORAD IDs:", df["NORAD_CAT_ID"].duplicated().sum())

    print("Missing values:", df.isna().sum().sum())

    return True


def main():

    file_path = "data/raw/celestrak/resource.csv"

    try:
        validate_catalog(file_path)

    except Exception as error:

        print("\nCatalog validation: FAILED")
        print("Reason:", error)

        raise


if __name__ == "__main__":
    main()
