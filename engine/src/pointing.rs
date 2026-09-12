pub fn pointing_loss_db(
    pointing_error_deg: f64,
    bandwidth_3db_deg: f64,
) -> f64 {
    12.0 * (pointing_error_deg / bandwidth_3db_deg).powi(2)
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn test_pointing_loss_is_non_negative(){

        let loss = pointing_loss_db(0.1,1.5);

        assert!(loss >= 0.0);
        assert!(loss.is_finite());
    }

    #[test]
    fn test_zero_pointing_error_has_zero_loss(){
        let loss = pointing_loss_db(0.0,1.5);
        assert_eq!(loss,0.0);
    }

    #[test]
    fn test_larger_pointing_error_has_larger_loss(){
        let small_error = pointing_loss_db(0.1,1.5);
        let large_error = pointing_loss_db(0.2,1.5);

        assert!(large_error > small_error);
    }
}