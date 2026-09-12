#[path = "../rain.rs"]
mod rain;

fn main() {
    let cases = [
        (
            "hyderabad_26ghz",
            17.03,
            78.18,
            26.0,
            30.0,
            0.54,
            0.01,
            65.0,
            45.0,
            1.2,
        ),
        (
            "london_reference",
            51.5,
            -0.14,
            14.25,
            31.07699124,
            0.031382984,
            1.0,
            26.48052,
            0.0,
            1.2,
        ),
    ];

    println!("case,rust_rain_db");

    for (
        case,
        lat,
        lon,
        freq_ghz,
        elevation_deg,
        hs_km,
        p,
        r001,
        tau,
        antenna_diameter_m,
    ) in cases
    {
        match rain::rain_loss_db(
            lat,
            lon,
            freq_ghz,
            elevation_deg,
            hs_km,
            p,
            r001,
            tau,
            antenna_diameter_m,
        ) {
            Ok(value) => println!("{case},{value}"),
            Err(error) => eprintln!("{case},ERROR: {error:?}"),
        }
    }
}
