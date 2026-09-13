from pathlib import Path

from src.ingest_data import validate_and_store


def test_corrupted_catalog_is_rejected(tmp_path):
    corrupted_file = tmp_path / "corrupted_catalog.csv"
    output_file = tmp_path / "resource.csv"

    corrupted_file.write_text(
        "THIS IS NOT A VALID SATELLITE CATALOG\n",
        encoding="utf-8",
    )

    result = validate_and_store(corrupted_file, output_file)

    assert result is False
    assert not output_file.exists()
    assert not corrupted_file.exists()
