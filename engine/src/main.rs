mod fspl; 
// Importing the fspl.rs file as a module so that we can use the functions defined in it.

fn main() {
    let loss = fspl::fspl_db(500.0, 26.0);
    println!("FSPL: {:.2} dB", loss);
}