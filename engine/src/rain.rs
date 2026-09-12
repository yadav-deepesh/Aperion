pub fn rain_loss_db(
    latitude_deg: f64, // Where on Earth the ground station is, north/south
    longitude_deg: f64, // where on Earth the ground station is, east/west
    frequency_ghz: f64, // Radio frequency being used
    elevation_deg: f64, // Angle from the ground station towards the satellite
    station_height_km: f64,
    time_percent: f64, // How often we want the rain attenuation to be exceeded 
    rain_rate_r001_mmh: f64,
    polarization_deg: f64,
    antenna_diameter_m: f64,
) -> Result<f64 , itu_rs::ItuError>{

    // Result<> in rust is like its answering a question.
    // If the fun runs successfully then it returns f64 value, if it fails then it returns and error of type itu_rs::ItuError.

    let options = itu_rs::SlantPathOptions{

        // options is a variable of type SlantPathOptions
        // SlantPathOptions is a struct provided by the itu_rs
        
        hs_km: Some(station_height_km),
        r001_mmh: Some(rain_rate_r001_mmh),
        tau_deg: polarization_deg,

        include_rain: true,
        include_gas: false,
        include_clouds: false,
        include_scintillation: false,

        ..itu_rs::SlantPathOptions::default()
    };
    // The main function provided by itu_rs is atmospheric_attenuation_slant_path
    // It accepts the variables we have created and also a struct provided by them called SlantPathOptions
    let attenuation = itu_rs::atmospheric_attenuation_slant_path(
        latitude_deg,
        longitude_deg,
        frequency_ghz,
        elevation_deg,
        time_percent,
        antenna_diameter_m,
        options,
    )?;

    Ok(attenuation.rain_db)
    // attenuation.rain_db is basically one of the values inside the attenuation struct returned by the atmospheric_attenuation_slant_path function
    // and we are asking it the rain_db variable's value which is the rain attenuation in dB


}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rain_loss_is_non_negative() {
        let result = rain_loss_db(
            45.4215, // latitude
            -75.6972, // longitude
            12.0, // frequency ghz
            30.0, // elevation
            0.0,  // station height km
            0.1, // time percentage
            26.0, // R001 rain rate mm/h
            0.0, //polarization tilt
            1.2,
        );

        let rain_loss = result.expect("rain calculation should succeed");
        assert!(rain_loss >= 0.0);
        assert!(rain_loss.is_finite());
    }

    #[test]
    fn test_rain_loss_itu_p618_reference(){
        let result = rain_loss_db(
        51.5,
        -0.14,
        14.25,
        31.07699124,
        0.031382984,
        1.0,
        26.48052,
        0.0,
        1.2,
        );

        let rain_loss = result.expect("rain calculation should succeed");
        
        assert!((rain_loss - 0.495317069).abs() < 0.001, "expected about 0.495317 dB, got {} dB", rain_loss);
    }
}