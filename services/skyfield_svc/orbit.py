import csv
from datetime import timedelta

from skyfield.api import EarthSatellite, load, wgs84

DOWNLINK_MIN_ELEVATION = 10.0
UPLINK_MIN_ELEVATION = 13.0

# Minimum usable uplink duration required for a pass
MIN_UPLINK_DURATION_S = 60.0

# Orbit propagation / visibility sampling interval
PROPAGATION_STEP_S = 30


def load_ground_station(site="shadnagar"):
    if site == "shadnagar":
        file_path = "data/reference/site_shadnagar.csv"
    elif site == "kulasekarapattinam":
        file_path = "data/reference/site_kulasekarapattinam.csv"
    else:
        raise ValueError(f"Unknown ground station: {site}")

    with open(file_path, mode="r") as file:
        station_data = list(csv.DictReader(file))

    station = station_data[0]

    return wgs84.latlon(
        float(station["lat_deg"]),
        float(station["lon_deg"]),
        elevation_m=float(station["alt_km"]) * 1000,
    )


def load_satellites():
    ts = load.timescale()

    with open("data/processed/catalog_50.csv", mode="r") as file:
        satellite_data = list(csv.DictReader(file))

    satellites = []

    for fields in satellite_data:
        satellites.append(EarthSatellite.from_omm(ts, fields))

    return ts, satellites


def sample_visibility(
    satellite,
    ground_station,
    ts,
    t0,
    t1,
    min_elevation,
):
    """
    Propagate the satellite at fixed 30-second intervals.

    This provides a deterministic visibility sampling layer.
    Skyfield's event finder is used separately to refine
    the exact AOS/LOS/max-elevation times.
    """

    difference = satellite - ground_station

    samples = []

    current_datetime = t0.utc_datetime()
    end_datetime = t1.utc_datetime()

    while current_datetime <= end_datetime:

        current_time = ts.utc(current_datetime)

        topocentric = difference.at(current_time)

        elevation, azimuth, _ = topocentric.altaz()

        samples.append(
            {
                "time": current_time,
                "elevation_deg": elevation.degrees,
                "azimuth_deg": azimuth.degrees,
                "visible": elevation.degrees >= min_elevation,
            }
        )

        current_datetime += timedelta(seconds=PROPAGATION_STEP_S)

    return samples


def find_passes(
    satellite,
    ground_station,
    ts,
    t0,
    t1,
    min_elevation,
):
    """
    Find visibility windows.

    First perform explicit 30-second propagation.
    Then use Skyfield's event finder to obtain
    accurate AOS / maximum-elevation / LOS times.
    """

    # ---------------------------------------------------------
    # 30-second propagation / visibility sampling
    # ---------------------------------------------------------

    samples = sample_visibility(
        satellite,
        ground_station,
        ts,
        t0,
        t1,
        min_elevation,
    )

    # If the sampling layer finds no visible points,
    # there is no useful pass to refine.
    if not any(sample["visible"] for sample in samples):
        return []

    # ---------------------------------------------------------
    # Refine the actual event times using Skyfield
    # ---------------------------------------------------------

    times, events = satellite.find_events(
        ground_station,
        t0,
        t1,
        altitude_degrees=min_elevation,
    )

    passes = []

    i = 0

    while i < len(events) - 2:

        if events[i] == 0 and events[i + 1] == 1 and events[i + 2] == 2:
            passes.append(
                (
                    times[i],
                    times[i + 1],
                    times[i + 2],
                )
            )

            i += 3

        else:
            i += 1

    return passes


def get_passes_for_satellite(
    norad_id: str,
    days: int = 7,
    site: str = "shadnagar",
):

    ts, satellites = load_satellites()
    ground_station = load_ground_station(site)

    satellite = None

    for sat in satellites:

        if str(sat.model.satnum) == str(norad_id):
            satellite = sat
            break

    if satellite is None:
        return []

    t0 = ts.now()
    t1 = ts.tt_jd(t0.tt + days)

    # ---------------------------------------------------------
    # Downlink pass windows
    # Minimum elevation = 10 degrees
    # ---------------------------------------------------------

    downlink_passes = find_passes(
        satellite,
        ground_station,
        ts,
        t0,
        t1,
        DOWNLINK_MIN_ELEVATION,
    )

    # ---------------------------------------------------------
    # Uplink pass windows
    # Minimum elevation = 13 degrees
    # ---------------------------------------------------------

    uplink_passes = find_passes(
        satellite,
        ground_station,
        ts,
        t0,
        t1,
        UPLINK_MIN_ELEVATION,
    )

    difference = satellite - ground_station

    passes = []

    for downlink in downlink_passes:

        aos_time, max_time, los_time = downlink

        # -----------------------------------------------------
        # Find the uplink window overlapping this downlink pass
        # -----------------------------------------------------

        ul_from = None
        ul_to = None

        for uplink in uplink_passes:

            candidate_from, _, candidate_to = uplink

            if candidate_from.tt < los_time.tt and candidate_to.tt > aos_time.tt:

                if candidate_from.tt > aos_time.tt:
                    ul_from = candidate_from
                else:
                    ul_from = aos_time

                if candidate_to.tt < los_time.tt:
                    ul_to = candidate_to
                else:
                    ul_to = los_time

                break

        # -----------------------------------------------------
        # Calculate uplink duration
        # -----------------------------------------------------

        if ul_from is not None and ul_to is not None:

            ul_duration_s = (
                ul_to.utc_datetime() - ul_from.utc_datetime()
            ).total_seconds()

        else:

            ul_duration_s = 0.0

        # -----------------------------------------------------
        # Check minimum uplink duration
        # -----------------------------------------------------

        ul_insufficient = ul_duration_s < MIN_UPLINK_DURATION_S

        # -----------------------------------------------------
        # Satellite position at AOS
        # -----------------------------------------------------

        aos_topocentric = difference.at(aos_time)

        _, aos_azimuth, _ = aos_topocentric.altaz()

        # -----------------------------------------------------
        # Satellite position at maximum elevation
        # -----------------------------------------------------

        max_topocentric = difference.at(max_time)

        max_elevation, _, _ = max_topocentric.altaz()

        # -----------------------------------------------------
        # Satellite position at LOS
        # -----------------------------------------------------

        los_topocentric = difference.at(los_time)

        _, los_azimuth, _ = los_topocentric.altaz()

        # -----------------------------------------------------
        # Total downlink pass duration
        # -----------------------------------------------------

        duration_s = (los_time.utc_datetime() - aos_time.utc_datetime()).total_seconds()

        # -----------------------------------------------------
        # Final pass record
        # -----------------------------------------------------

        pass_data = {
            "aos": aos_time.utc_iso(),
            "los": los_time.utc_iso(),
            "max_el": float(round(max_elevation.degrees, 2)),
            "az_aos": float(round(aos_azimuth.degrees, 2)),
            "az_los": float(round(los_azimuth.degrees, 2)),
            "duration_s": float(round(duration_s, 2)),
            "ul_from": (ul_from.utc_iso() if ul_from is not None else None),
            "ul_to": (ul_to.utc_iso() if ul_to is not None else None),
            "ul_duration_s": float(round(ul_duration_s, 2)),
            "ul_insufficient": ul_insufficient,
        }

        passes.append(pass_data)

    return passes
