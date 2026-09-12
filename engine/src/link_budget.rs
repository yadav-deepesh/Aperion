pub fn total_loss_db(
    fspl_db: f64,
    rain_db: f64,
    gas_db: f64,
    cloud_db: f64,
    scintillation_db: f64,
    pointing_db: f64,
    polarization_db: f64,
) -> f64 {
    fspl_db + rain_db + gas_db + cloud_db + scintillation_db + pointing_db + polarization_db
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn test_total_loss(){
        let total = total_loss_db(
            174.73,
            1.932226,
            0.206121,
            0.122849,
            0.335386,
            0.053333,
            0.033115,            
        );

        assert!((total - 177.41303).abs() < 0.001);
    }

    #[test]
    fn test_zero_losses(){
        let total = total_loss_db(
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
        );

        assert_eq!(0.0,total);
    }
}