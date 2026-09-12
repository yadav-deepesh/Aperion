pub fn received_power_dbm(
    transmit_power_dbm: f64,
    tx_gain_db: f64,
    rx_gain_db: f64,
    total_loss_db: f64,
) -> f64 {
    transmit_power_dbm + tx_gain_db + rx_gain_db - total_loss_db
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn test_received_power(){
        let power = received_power_dbm(
            20.0,
            40.0,
            40.0,
            177.413,            
        );

        assert!((power - (-77.413)).abs() < 0.001);
    }
    
    #[test]
    fn test_higher_loss_reduces_received_power(){
        let lower_loss = received_power_dbm(20.0, 40.0, 40.0, 100.0);
        let higher_loss = received_power_dbm(20.0, 40.0, 40.0, 120.0);

        assert!(higher_loss < lower_loss);
    }
}