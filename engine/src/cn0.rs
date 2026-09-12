
pub fn noise_density_dbm_hz(system_temperature_k: f64) -> f64 {
    const BOLTZMAN: f64 = 1.380649e-23;

    10.0 * (BOLTZMAN * system_temperature_k).log10() + 30.0
}

pub fn cn0_db_hz(
    received_power_dbm: f64,
    noise_density_dbm_hz: f64,
) -> f64 {
    received_power_dbm - noise_density_dbm_hz
}


#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn test_noise_density_reference_temperature(){
        let noise = noise_density_dbm_hz(290.0);

        assert!((noise - (-173.975)).abs() < 0.01);
    }

    #[test]
    fn test_higher_temperature_means_more_noise(){
        let low_temperature = noise_density_dbm_hz(290.0);
        let high_temperature = noise_density_dbm_hz(580.0);

        assert!(high_temperature > low_temperature);
    }
    
    #[test]
    fn test_cn0_calculation() {
        let cn0 = cn0_db_hz(-77.413, -173.975);

        assert!((cn0 - 96.562).abs() < 0.001);
    }
}