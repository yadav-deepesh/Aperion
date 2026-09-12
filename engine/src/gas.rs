pub fn gas_loss_db(
    latitude_deg: f64, // ground station latitude
    longitude_deg: f64, // ground station longitude
    frequency_ghz: f64, // signal frequency
    elevation_deg: f64, // satellite's elevation angle
    time_percent: f64, // percentage of time exceeded
    antenna_diameter_m: f64, // antenna diameter
) -> Result<f64, itu_rs::ItuError> {
    let attenuation = itu_rs::gas_attenuation_default(
        latitude_deg,
        longitude_deg,
        frequency_ghz,
        elevation_deg,
        time_percent,
        antenna_diameter_m,
    )?;
    
    Ok(attenuation)

}

#[cfg(test)]
mod tests{
    use super::*;

    #[test]
    fn test_gas_loss_is_non_negative(){
        let result = gas_loss_db(
            45.4215,
            -75.6972,
            12.0,
            30.0,
            0.1,
            1.2,            
        );

        let gas_loss = result.expect("gas calculation should succeed");

        assert!(gas_loss >= 0.0);
        assert!(gas_loss.is_finite());
    }
}