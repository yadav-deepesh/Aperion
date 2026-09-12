mod fspl; 
// Importing the fspl.rs file as a module so that we can use the functions defined in it.
mod rain;
mod gas;
mod cloud;
mod scintillation;
mod pointing;
mod polarization;

fn main() {
    let loss = fspl::fspl_db(500.0, 26.0);
    println!("FSPL: {:.2} dB", loss);

    let rain = rain::rain_loss_db(
        45.4215, 
        -75.6972, 
        12.0, 
        30.0, 
        0.0,
        0.1, 
        26.0,
        0.0,    
        1.2,
    );
    println!("Rain attenuation: {:?}", rain);

    let gas = gas::gas_loss_db(
    45.4215,
    -75.6972,
    12.0,
    30.0,
    0.1,
    1.2,
    );
    println!("Gas Attenuation: {:?}", gas);

    let cloud = cloud::cloud_loss_db(
    45.4215,
    -75.6972,
    12.0,
    30.0,
    0.1,
    0.5,        
    );
    println!("Cloud Attenuation: {:?}",cloud);

    let scintillation = scintillation::scintillation_loss_db(
            45.4215,
            -75.6972,
            12.0,
            30.0,
            0.1,
            1.2,   
    );
    println!("Scintillation Attenuation: {:?}", scintillation);

    let pointing = pointing::pointing_loss_db(0.1,1.5);
    println!("Pointing Loss: {:.6} dB", pointing);

    let polarization = polarization::polarization_loss_db(5.0);
    println!("Polarization Loss: {:?}", polarization);
}