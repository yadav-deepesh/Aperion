use std::net::SocketAddr;
use std::time::Duration;

use tokio::time::sleep;
use tonic::transport::Server;
use tonic::Request;

use engine::grpc::proto::link_engine_client::LinkEngineClient;
use engine::grpc::proto::link_engine_server::LinkEngineServer;
use engine::grpc::proto::ComputeRequest;

// We need the same service implementation used by the real server.
use engine::grpc::EngineService;

#[tokio::test]
async fn grpc_compute_budget_returns_result() {
    let address: SocketAddr = "127.0.0.1:50052".parse().unwrap();

    tokio::spawn(async move {
        Server::builder()
            .add_service(LinkEngineServer::new(EngineService))
            .serve(address)
            .await
            .unwrap();
    });

    // Give the server a moment to start.
    sleep(Duration::from_millis(100)).await;

    let mut client = LinkEngineClient::connect("http://127.0.0.1:50052")
        .await
        .unwrap();

    let request = ComputeRequest {
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

    let response = client
        .compute_budget(Request::new(request))
        .await
        .unwrap()
        .into_inner();

    assert!(response.fspl_db > 0.0);
    assert!(response.total_loss_db > 0.0);
    assert!(response.pointing_db > 0.0);
    assert!(response.polarization_db > 0.0);
    assert!(response.received_power_dbm.is_finite());
    assert!(response.cn0_db_hz.is_finite());
}