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

fn main() {
    // ----------------------FSPL----------------------
    let loss = fspl::fspl_db(500.0, 26.0);
    println!("FSPL: {:.2} dB", loss);
    // ------------------------------------------------
    // ----------------------RAIN----------------------
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
    // ------------------------------------------------
    
    // ----------------------GAS----------------------
    let gas = gas::gas_loss_db(
        45.4215,
        -75.6972,
        12.0,
        30.0,
        0.1,
        1.2,
    );
    println!("Gas Attenuation: {:?}", gas);
    // ------------------------------------------------
    
    // ----------------------CLOUD----------------------
    let cloud = cloud::cloud_loss_db(
        45.4215,
        -75.6972,
        12.0,
        30.0,
        0.1,
        0.5,        
    );
    println!("Cloud Attenuation: {:?}",cloud);
    // ------------------------------------------------
    
    // ----------------------SCINTILLATION----------------------
    let scintillation = scintillation::scintillation_loss_db(
        45.4215,
        -75.6972,
        12.0,
        30.0,
        0.1,
        1.2,   
    );
    println!("Scintillation Attenuation: {:?}", scintillation);
    // ------------------------------------------------
    
    // ----------------------POINTING----------------------
    let pointing = pointing::pointing_loss_db(0.1,1.5);
    println!("Pointing Loss: {:.6} dB", pointing);
    // ------------------------------------------------
    
    // ----------------------POLARIZATION----------------------
    let polarization = polarization::polarization_loss_db(5.0);
    println!("Polarization Loss: {:?}", polarization);
    // ------------------------------------------------
    
    // ----------------------LINK-BUDGET----------------------
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
    // ------------------------------------------------
    
    // ----------------------RECEIVED-POWER----------------------
    let received_power = received_power::received_power_dbm(20.0,40.0,40.0,total_loss);
    println!("Received Power: {:.3}",received_power);
    // ------------------------------------------------
    
    // ----------------------cn0.rs----------------------
    let noise_density = cn0::noise_density_dbm_hz(290.0);
    println!("Noise Density: {:.3} dBm/Hz", noise_density);
    
    let cn0 = cn0::cn0_db_hz(received_power, noise_density);
    println!("C/N0: {:.3} dB-Hz", cn0);
    // ------------------------------------------------
    
    // ----------------------modcod.rs----------------------
    let es_n0_db = 3.5; // Example value for Es/N0 in dB
    let selected_modcod = modcod::select_modcod(es_n0_db);
    println!("Es/N0: {:.2} dB", es_n0_db);
    
    match selected_modcod {
        Some(modcod) => {
            println!("Selected MODCOD: {}", modcod.name);
            println!("Required Es/N0: {:.2} dB", modcod.required_es_n0_db);
            println!("Spectral Efficiency: {:.3} bits/symbol", modcod.spectral_efficiency);
        }
        None => {
            println!("No Supported MODCOD for this Es/N0");
        }
    }
    // ------------------------------------------------------
}