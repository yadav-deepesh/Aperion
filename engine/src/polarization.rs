pub fn polarization_loss_db(mismatch_angle_deg: f64) -> Result<f64, &'static str> {
    if!(0.0..90.0).contains(&mismatch_angle_deg){
        return Err("polarization mismatch angle must be between 0 and 90 degrees");
    }

    let angle_rad = mismatch_angle_deg.to_radians();

    let loss = -10.0 * angle_rad.cos().powi(2).log10();

    Ok(loss)
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn test_zero_mismatch_has_zero_loss(){
        let loss = polarization_loss_db(0.0).expect("polarization calculation should succeed");
        assert!(loss.abs() < 1e-10);
    }
    
    #[test]
    fn test_larger_mismatch_has_larger_loss(){
        let small_mismatch = polarization_loss_db(5.0).expect("polarization calculation should succeed");
        let large_mismatch = polarization_loss_db(10.0).expect("polarization calculation should succeed");
        assert!(large_mismatch > small_mismatch);
    }

    #[test]
    fn test_invalid_angle_is_rejected(){
        assert!(polarization_loss_db(90.0).is_err());
        assert!(polarization_loss_db(-1.0).is_err());
    }
}