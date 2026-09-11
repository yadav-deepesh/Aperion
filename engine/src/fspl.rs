// Source: ITU-R P.525-4, free-space attenuation.
// 92.45 is the constant for distance in km and frequency in GHz.

pub fn fspl_db(distance_km: f64, frequency_ghz: f64) -> f64 {
    92.45 + 20.0 * distance_km.log10() + 20.0 * frequency_ghz.log10()
}
// pub basically means public function
// to return a value in a function, we either type return <value> or just put the value at the end of the function without a semicolon

#[cfg(test)] 
// This means the below code will only be compiled when doing Cargo tests, not while doing cargo run
mod tests { 
    // This is a module (mod = module) and to access stuff outside this module, we need to use super::*; 
    use super::*; 
    // Here there is no outer module created by us, but in rust the whole file itself is considered a module, so we are using super::
    //* to access the outer module (the file itself) and use the fspl_db function defined in it.

    #[test] 
    // This tells rust that the just below function is a test function and it should be run when we do cargo test else 
    // it will be treated as a normal function and will not be run when we do cargo test
    fn test_fspl_reference_case() { // TEST CASE 1: REFERENCE CASE
        let result = fspl_db(500.0, 26.0);

        assert!((result - 174.73).abs() < 0.1);
        // assert! is a macro used to check if a condition is true or not
        // .abs() is a method that returns the absolute value of a number (eg: -5.0.abs() = 5.0 & 5.0.abs() = 5.0)
    }

    #[test]
    fn test_high_low_frequency_case(){ // TEST CASE 2: HIGH-LOW FREQUENCY CASE
        let low_freq_result = fspl_db(500.0, 10.0);
        let high_freq_result = fspl_db(500.0, 20.0);
        assert!(high_freq_result > low_freq_result);
    }

    #[test]
    fn test_high_low_distance_case(){ // TEST CASE 3: HIGH-LOW DISTANCE CASE
        let low_distance_result = fspl_db(500.0, 26.0);
        let high_distance_result = fspl_db(1000.0, 26.0);
        assert!(high_distance_result > low_distance_result);
    }
}