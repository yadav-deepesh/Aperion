mod fspl; 
// Importing the fspl.rs file as a module so that we can use the functions defined in it.
mod rain;

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
}