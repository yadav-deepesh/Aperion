use tonic::{Request, Response, Status};

use crate::compute_budget::ComputeBudget;

pub mod proto {
    tonic::include_proto!("engine");
}

use proto::link_engine_server::LinkEngine;
use proto::{ComputeRequest, ComputeResponse};

pub struct EngineService;

#[tonic::async_trait]
impl LinkEngine for EngineService {
    async fn compute_budget(
        &self,
        request: Request<ComputeRequest>,
    ) -> Result<Response<ComputeResponse>, Status> {
        let input = request.into_inner();

        let budget = ComputeBudget {
            distance_km: input.distance_km,
            latitude_deg: input.latitude_deg,
            longitude_deg: input.longitude_deg,
            frequency_ghz: input.frequency_ghz,
            elevation_deg: input.elevation_deg,
            station_height_km: input.station_height_km,
            time_percent: input.time_percent,
            rain_rate_r001_mmh: input.rain_rate_r001_mmh,
            rain_polarization_deg: input.rain_polarization_deg,
            polarization_mismatch_deg: input.polarization_mismatch_deg,
            antenna_diameter_m: input.antenna_diameter_m,
            symbol_rate_sps: input.symbol_rate_sps,
            bandwidth_hz: input.bandwidth_hz,
            pointing_error_deg: input.pointing_error_deg,
            beamwidth_3db_deg: input.beamwidth_3db_deg,
            transmit_power_dbm: input.transmit_power_dbm,
            tx_gain_dbi: input.tx_gain_dbi,
            rx_gain_dbi: input.rx_gain_dbi,
            interference_to_noise_db: input.interference_to_noise_db,
            system_temperature_k: input.system_temperature_k,
        };

        let result = budget
            .compute()
            .map_err(Status::internal)?;

        let response = ComputeResponse {
            fspl_db: result.fspl_db,
            rain_db: result.rain_db,
            gas_db: result.gas_db,
            cloud_db: result.cloud_db,
            scintillation_db: result.scintillation_db,
            pointing_db: result.pointing_db,
            polarization_db: result.polarization_db,
            total_loss_db: result.total_loss_db,
            received_power_dbm: result.received_power_dbm,
            noise_density_dbm_hz: result.noise_density_dbm_hz,
            cn0_db_hz: result.cn0_db_hz,
            effective_cn0_db_hz: result.effective_cn0_db_hz,
            modcod_name: result.modcod_name.unwrap_or("").to_string(),
            spectral_efficiency: result.spectral_efficiency.unwrap_or(0.0),
            data_rate_mbps: result.data_rate_mbps,
        };

        Ok(Response::new(response))
    }
}