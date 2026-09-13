// 5G interference increases the effective noise seen by the receiver.
// I/N describes the interference power relative to the thermal noise.

pub fn effective_cn0_db_hz(
    cn0_db_hz: f64,
    interference_to_noise_db: f64,
) -> f64 {
    let interference_ratio = 10.0_f64.powf(interference_to_noise_db / 10.0); // converts I/N from dB into a normal linear ratio.

    cn0_db_hz - 10.0 * (1.0 + interference_ratio).log10() // (1.0 + interference_ratio) : combines thermal noise + interference
    // cn0_db_hz - 10.0 * ... : gives us the effective C/N0 after interference.
}

#[cfg(test)]
mod tests{
    use super::*;

    #[test]
    fn no_interference_causes_small_loss(){
        let result = effective_cn0_db_hz(96.562, -100.0);
        assert!((result - 96.562).abs() < 0.01);
    }

    #[test]
    fn interference_equal_to_noise_reduces_cn0_by_about_3db(){
        let result = effective_cn0_db_hz(96.562, 0.0);
        assert!((result - 93.552).abs() < 0.01);
    }

    #[test]
    fn stronger_interference_reduces_cn0_more(){
        let weak_interference = effective_cn0_db_hz(96.562, -10.0);
        let strong_interference = effective_cn0_db_hz(96.562, 10.0);
        assert!(strong_interference < weak_interference);
    }
}