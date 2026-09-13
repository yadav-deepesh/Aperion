// Importing the fspl.rs file as a module so that we can use the functions defined in it.
mod fspl; 
mod rain;
mod gas;
mod cloud;
mod scintillation;
mod pointing;
mod polarization;
mod link_budget;
mod received_power;
mod cn0;
mod modcod;
mod interference;
mod compute_budget;

fn main() {
    let budget = compute_budget::ComputeBudget {
        // Pointing
        pointing_error_deg: 0.1,
        beamwidth_3db_deg: 1.5,

        // Power and antenna
        transmit_power_dbm: 20.0,
        tx_gain_dbi: 40.0,
        rx_gain_dbi: 40.0,

        // 5G interference and noise
        interference_to_noise_db: 0.0,
        system_temperature_k: 290.0,

        // Geometry
        distance_km: 500.0,
        latitude_deg: 45.4215,
        longitude_deg: -75.6972,
        frequency_ghz: 12.0,
        elevation_deg: 30.0,
        station_height_km: 0.0,

        // Rain
        time_percent: 0.1,
        rain_rate_r001_mmh: 26.0,
        rain_polarization_deg: 0.0,
        polarization_mismatch_deg: 5.0,
        antenna_diameter_m: 1.2,

        // DVB-S2
        symbol_rate_sps: 1_000_000.0,
        bandwidth_hz: 10_000_000.0,
    };

    match budget.compute() {
        Ok(result) => {
            println!("FSPL: {:.3} dB", result.fspl_db);
            println!("Rain: {:.3} dB", result.rain_db);
            println!("Gas: {:.3} dB", result.gas_db);
            println!("Cloud: {:.3} dB", result.cloud_db);
            println!("Scintillation: {:.3} dB", result.scintillation_db);
            println!("Pointing: {:.3} dB", result.pointing_db);
            println!("Polarization: {:.3} dB", result.polarization_db);
            println!("Total Link Loss: {:.3} dB", result.total_loss_db);
            println!("Received Power: {:.3} dBm", result.received_power_dbm);
            println!("Noise Density: {:.3} dBm/Hz", result.noise_density_dbm_hz);
            println!("C/N0: {:.3} dB-Hz", result.cn0_db_hz);
            println!("Effective C/N0: {:.3} dB-Hz", result.effective_cn0_db_hz);

            match result.modcod_name {
                Some(name) => println!("Selected MODCOD: {}", name),
                None => println!("No supported MODCOD"),
            }

            if let Some(efficiency) = result.spectral_efficiency {
                println!("Spectral Efficiency: {:.3} bits/symbol", efficiency);
            }

            println!("Data Rate: {:.3} Mbps", result.data_rate_mbps);
        }

        Err(error) => {
            eprintln!("Link budget calculation failed: {}", error);
        }
    }
}