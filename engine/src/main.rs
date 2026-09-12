mod fspl; 
// Importing the fspl.rs file as a module so that we can use the functions defined in it.
mod rain;
mod gas;
mod cloud;
mod scintillation;
mod pointing;
mod polarization;
mod link_budget;
mod received_power;

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

    let total_loss = link_budget::total_loss_db(
    174.73,
    1.9322262665,
    0.2061205685,
    0.1228485903,
    0.3353860066,
    0.053333,
    0.0331154797,        
    );
    println!("Total Link Loss: {:.3} dB", total_loss);

    let received_power = received_power::received_power_dbm(20.0,40.0,40.0,total_loss);
    println!("Received Power: {:.3}",received_power);
}