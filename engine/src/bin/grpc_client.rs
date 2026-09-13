use tonic::Request;

pub mod proto {
    tonic::include_proto!("engine");
}

use proto::link_engine_client::LinkEngineClient;
use proto::ComputeRequest;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = LinkEngineClient::connect("http://127.0.0.1:50051").await?;

    // Request 1
    let request1 = ComputeRequest {
        distance_km: 500.0,
        latitude_deg: 51.5,
        longitude_deg: -0.14,
        frequency_ghz: 12.0,
        elevation_deg: 31.0,
        station_height_km: 0.03,
        time_percent: 0.01,
        rain_rate_r001_mmh: 26.48,
        antenna_diameter_m: 1.2,
        transmit_power_dbm: 30.0,
        tx_gain_dbi: 40.0,
        rx_gain_dbi: 40.0,
        system_temperature_k: 500.0,
        interference_to_noise_db: -10.0,
        pointing_error_deg: 0.1,
        beamwidth_3db_deg: 1.5,
        rain_polarization_deg: 0.0,
        polarization_mismatch_deg: 5.0,
        symbol_rate_sps: 10_000_000.0,
        bandwidth_hz: 10_000_000.0,
    };

    let response1 = client
        .compute_budget(Request::new(request1))
        .await?;

    println!("===== REQUEST 1 =====");
    println!("{:#?}", response1.into_inner());

    // Request 2 - deliberately different values
    let request2 = ComputeRequest {
        distance_km: 1000.0,
        latitude_deg: 28.6,
        longitude_deg: 77.2,
        frequency_ghz: 26.0,
        elevation_deg: 45.0,
        station_height_km: 0.03,
        time_percent: 0.01,
        rain_rate_r001_mmh: 50.0,
        antenna_diameter_m: 2.0,
        transmit_power_dbm: 20.0,
        tx_gain_dbi: 30.0,
        rx_gain_dbi: 35.0,
        system_temperature_k: 800.0,
        interference_to_noise_db: 0.0,
        pointing_error_deg: 0.5,
        beamwidth_3db_deg: 1.0,
        rain_polarization_deg: 45.0,
        polarization_mismatch_deg: 10.0,
        symbol_rate_sps: 5_000_000.0,
        bandwidth_hz: 5_000_000.0,
    };

    let response2 = client
        .compute_budget(Request::new(request2))
        .await?;

    println!();
    println!("===== REQUEST 2 =====");
    println!("{:#?}", response2.into_inner());

    Ok(())
}