// Importing the fspl.rs file as a module so that we can use the functions defined in it.
use engine::grpc;

use std::net::SocketAddr;
use tonic::transport::Server;

use grpc::proto::link_engine_server::LinkEngineServer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address: SocketAddr = "127.0.0.1:50051".parse()?;

    println!("Rust Link Engine listening on {}", address);

    Server::builder()
        .add_service(LinkEngineServer::new(grpc::EngineService))
        .serve(address)
        .await?;

    Ok(())
}