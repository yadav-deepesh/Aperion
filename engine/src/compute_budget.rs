use crate::cn0::{cn0_db_hz, noise_density_dbm_hz};
use crate::cloud::cloud_loss_db;
use crate::fspl::fspl_db;
use crate::gas::gas_loss_db;
use crate::interference::effective_cn0_db_hz;
use crate::link_budget::total_loss_db;
use crate::modcod::select_modcod;
use crate::pointing::pointing_loss_db;
use crate::polarization::polarization_loss_db;
use crate::rain::rain_loss_db;
use crate::received_power::received_power_dbm;
use crate::scintillation::scintillation_loss_db;

pub struct ComputeBudget {
    // Removed Hardcooded values to below variables
    pub pointing_error_deg: f64,
    pub beamwidth_3db_deg: f64,
    pub transmit_power_dbm: f64,
    pub tx_gain_dbi: f64,
    pub rx_gain_dbi: f64,
    pub interference_to_noise_db: f64,
    pub system_temperature_k: f64,
    // --------------------------------------------

    pub distance_km: f64,
    pub latitude_deg: f64,
    pub longitude_deg: f64,
    pub frequency_ghz: f64,
    pub elevation_deg: f64,
    pub station_height_km: f64,
    pub time_percent: f64,
    pub rain_rate_r001_mmh: f64,
    pub rain_polarization_deg: f64,
    pub polarization_mismatch_deg: f64,
    pub antenna_diameter_m: f64,
    pub symbol_rate_sps: f64,
    pub bandwidth_hz: f64,
}

#[derive(Debug)]
pub struct LinkResult {
    pub fspl_db: f64,
    pub rain_db: f64,
    pub gas_db: f64,
    pub cloud_db: f64,
    pub scintillation_db: f64,
    pub pointing_db: f64,
    pub polarization_db: f64,
    pub total_loss_db: f64,
    pub received_power_dbm: f64,
    pub noise_density_dbm_hz: f64,
    pub cn0_db_hz: f64,
    pub effective_cn0_db_hz: f64,
    pub modcod_name: Option<&'static str>,
    pub spectral_efficiency: Option<f64>,
    pub data_rate_mbps: f64,
}

impl ComputeBudget {

    // Above line means : I am going to define behavior/function for ComputeBudget struct
    pub fn compute(&self) -> Result<LinkResult, String> { 
        // &self means: Use the input values stored inside this ComputeBudget
        // Result<LinkResult, String> means: If everything works, return LinkResult, if something goes wrong, return a String with an error message.
        
        // -------------------------FSPL
        let fspl = fspl_db(
            self.distance_km, // distance between satellite and ground station
            self.frequency_ghz, // operating frequency
        );
        // -----------------------------
        
        // -------------------------RAIN
        let rain = rain_loss_db(
            self.latitude_deg,
            self.longitude_deg,
            self.frequency_ghz,
            self.elevation_deg,
            self.station_height_km,
            self.time_percent,
            self.rain_rate_r001_mmh,
            self.rain_polarization_deg,
            self.antenna_diameter_m,    
        ).map_err(|error| format!("rain calculation failed: {error:?}"))?;
        // -----------------------------
        
        // -------------------------GAS
        let gas = gas_loss_db(
            self.latitude_deg,
            self.longitude_deg,
            self.frequency_ghz,
            self.elevation_deg,
            self.time_percent,
            self.antenna_diameter_m,
        ).map_err(|error| format!("gas calculation failed: {error:?}"))?;
        // -----------------------------

        // -------------------------CLOUD
        let cloud = cloud_loss_db(
            self.latitude_deg,
            self.longitude_deg,
            self.frequency_ghz,
            self.elevation_deg,
            self.time_percent,
            self.antenna_diameter_m,
        ).map_err(|error| format!("cloud calculation failed: {error:?}"))?;
        // -----------------------------
        
        // -------------------------SCINTILLATION
        let scintillation = scintillation_loss_db(
            self.latitude_deg,
            self.longitude_deg,
            self.frequency_ghz,
            self.elevation_deg,
            self.time_percent,
            self.antenna_diameter_m,
        ).map_err(|error| format!("scintillation calculation failed: {error:?}"))?;       
        // -----------------------------
        
        // -------------------------POINTING
        let pointing = pointing_loss_db(
            self.pointing_error_deg,
            self.beamwidth_3db_deg,
        );
        // -----------------------------
        
        // -------------------------POLARIZATION
        let polarization = polarization_loss_db(self.polarization_mismatch_deg)
        .map_err(|error| format!("polarization calculation failed: {error}"))?;
        // -----------------------------
        
        // -------------------------COMBINED-LOSS
        let total_loss = total_loss_db(
            fspl,
            rain,
            gas,
            cloud,
            scintillation,
            pointing,
            polarization,
        );
        // -----------------------------
        
        // -------------------------ADDING-RECEIVED-POWER
        let received_power = received_power_dbm(
            self.transmit_power_dbm,
            self.tx_gain_dbi,
            self.rx_gain_dbi,
            total_loss,
        );
        // -----------------------------
        
        // -------------------------NOISE-DENSITY-AND-C/N0
        let noise_density = noise_density_dbm_hz(self.system_temperature_k);
        
        let cn0 = cn0_db_hz(
            received_power,
            noise_density,
        );
        // -----------------------------
        
        // -------------------------5G-INTERFERENCE
        let effective_cn0 = effective_cn0_db_hz(
            cn0,
            self.interference_to_noise_db,
        );
        // -----------------------------
        
        // -------------------------MODCOD
        let es_n0_db = effective_cn0 - 10.0 * self.symbol_rate_sps.log10();
        
        let modcod = select_modcod(es_n0_db);
        
        let (modcod_name, spectral_efficiency) = match modcod {
            Some(value) => (Some(value.name), Some(value.spectral_efficiency)),
            None => (None, None),
        };
        // -----------------------------
        
        // -------------------------DATA-RATE
        let data_rate_mbps = match modcod {
            Some(value) => value.spectral_efficiency * self.bandwidth_hz / 1_000_000.0,
            None => 0.0,
        };
        // -----------------------------
        
        Ok(LinkResult {
            fspl_db: fspl,
            rain_db: rain,
            gas_db: gas,
            cloud_db: cloud,
            scintillation_db: scintillation,
            pointing_db: pointing,
            polarization_db: polarization,
            total_loss_db: total_loss,
            received_power_dbm: received_power,
            noise_density_dbm_hz: noise_density,
            cn0_db_hz: cn0,
            effective_cn0_db_hz: effective_cn0,
            modcod_name,
            spectral_efficiency,
            data_rate_mbps,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compute_budget_produces_link_result() {
        let budget = ComputeBudget {
            pointing_error_deg: 0.1,
            beamwidth_3db_deg: 1.5,
            transmit_power_dbm: 20.0,
            tx_gain_dbi: 40.0,
            rx_gain_dbi: 40.0,
            interference_to_noise_db: 0.0,
            system_temperature_k: 290.0,
            distance_km: 500.0,
            latitude_deg: 17.03,
            longitude_deg: 78.18,
            frequency_ghz: 26.0,
            elevation_deg: 30.0,
            station_height_km: 0.54,
            time_percent: 0.01,
            rain_rate_r001_mmh: 65.0,
            rain_polarization_deg: 65.0,
            polarization_mismatch_deg: 5.0,
            antenna_diameter_m: 1.2,
            symbol_rate_sps: 1_000_000.0,
            bandwidth_hz: 10_000_000.0,
        };

        let result = budget.compute().expect("link budget should calculate");

        assert!(result.fspl_db.is_finite());
        assert!(result.total_loss_db.is_finite());
        assert!(result.received_power_dbm.is_finite());
        assert!(result.cn0_db_hz.is_finite());
        assert!(result.effective_cn0_db_hz.is_finite());
        assert!(result.data_rate_mbps >= 0.0);
    }
}