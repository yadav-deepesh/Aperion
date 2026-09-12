pub fn cloud_loss_db(
    latitude_deg: f64,
    longitude_deg: f64,
    frequency_ghz: f64,
    elevation_deg: f64,
    time_percent: f64,
    cloud_liquid_water_kgm2: f64,
) -> Result<f64, itu_rs::ItuError> {
    let attenuation = itu_rs::cloud_attenuation_db(
        latitude_deg,
        longitude_deg,
        elevation_deg,
        frequency_ghz,
        time_percent,
        Some(cloud_liquid_water_kgm2),
    )?;

    Ok(attenuation)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cloud_loss_is_non_negative() {
        let result = cloud_loss_db(
            45.4215,
            -75.6972,
            12.0,
            30.0,
            0.1,
            0.5,
        );

        let cloud_loss = result.expect("cloud calculation should succeed");

        assert!(cloud_loss >= 0.0);
        assert!(cloud_loss.is_finite());
    }
}