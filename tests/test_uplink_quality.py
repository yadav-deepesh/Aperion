from datetime import datetime, timezone

MIN_UPLINK_DURATION_S = 60.0


def test_ul_insufficient_when_duration_is_below_60_seconds():
    ul_from = datetime(2026, 9, 8, 6, 10, 0, tzinfo=timezone.utc)
    ul_to = datetime(2026, 9, 8, 6, 10, 45, tzinfo=timezone.utc)

    ul_duration_s = (ul_to - ul_from).total_seconds()

    ul_insufficient = ul_duration_s < MIN_UPLINK_DURATION_S

    assert ul_duration_s == 45.0
    assert ul_insufficient is True
