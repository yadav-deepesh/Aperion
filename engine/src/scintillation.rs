pub fn scintillation_loss_db(
    latitude_deg: f64,
    longitude_deg: f64,
    frequency_ghz: f64,
    elevation_deg: f64,
    time_percent: f64,
    antenna_diameter_m: f64,
) -> Result<f64, itu_rs::ItuError>{
    let attenuation = itu_rs::scintillation_attenuation_db(
        latitude_deg, // latitude 
        longitude_deg, // longitude
        frequency_ghz, // frequency
        elevation_deg, // elevation
        time_percent, // time out 
        antenna_diameter_m, // antenna diameter
        0.5, // antenna efficiency
        None, // temperature from map
        None, // humidity from map
        None, // pressure from map
        1000.0, // turbulent layer height in metres
    )?;
    
    Ok(attenuation)
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn test_scintillation_loss_is_non_negative(){
        
        let result = scintillation_loss_db(
            45.4215,
            -75.6972,
            12.0,
            30.0,
            0.1,
            1.2,            
        );

        let scintillation_loss = result.expect("scintillation calculation should succeed");

        assert!(scintillation_loss >= 0.0);
        assert!(scintillation_loss.is_finite());
    }
}