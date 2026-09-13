// C/N0 provides how good is the connection
// MODCOD: Modulation and Coding tells what modulation and coding scheme should be used 
// and how much error correction should I add.

#[derive(Debug, Clone, Copy, PartialEq)] 
// This Above tells rust that for this struct automatically generate some abilities for me (Saves us from writing boilerplate code)
// Debug: allows us to print the struct using println!("{:?}", modcod);
// Clone: Allows us to make a copy of the value
// Copy: Rust can simply copy automatically when u assign the value
// PartialEq: Lets us compare two Modcod values using == 
pub struct Modcod {
    pub name: &'static str, // 'static : the string will exist for the entire lifetime of the program
    pub required_es_n0_db: f64, // The minimum/required Es/N₀ for that MODCOD, measured in dB.
    pub spectral_efficiency: f64, // How efficiently that MODCOD converts bandwidth into data.
}

pub const MODCOD_TABLE: &[Modcod] = &[  
    // &[Modcod] is basically a reference, you can look but u don't own it
    // = &[] is also just equating the MODCOD_TABLE variable with the reference of the below values.
    Modcod{
        name: "QPSK 1/4", 
        // QPSK : Quadrature Phase Shift Keying - Modulation Scheme
        // 1/4 here is the FEC code rate. FEC - Forward Error Correction. 1/4 means Low data rate but more reliable connection
        required_es_n0_db: -2.35,
        spectral_efficiency: 0.490,
    },
    Modcod{
        name: "QPSK 1/3",
        required_es_n0_db: -1.24,
        spectral_efficiency: 0.656,        
    },
    Modcod{
        name: "QPSK 2/5",
        required_es_n0_db: -0.30,
        spectral_efficiency: 0.789,
    },
    Modcod{
        name: "QPSK 1/2",
        required_es_n0_db: 1.00,
        spectral_efficiency: 0.988,
    },
    Modcod {
        name: "QPSK 3/5",
        required_es_n0_db: 2.23,
        spectral_efficiency: 1.188,
    },
    Modcod {
        name: "QPSK 2/3",
        required_es_n0_db: 3.10,
        spectral_efficiency: 1.322,
    },
    Modcod {
        name: "QPSK 3/4",
        required_es_n0_db: 4.03,
        spectral_efficiency: 1.487,
    },
    Modcod {
        name: "QPSK 4/5",
        required_es_n0_db: 4.68,
        spectral_efficiency: 1.587,
    },
    Modcod {
        name: "QPSK 5/6",
        required_es_n0_db: 5.18,
        spectral_efficiency: 1.655,
    },
    Modcod {
        name: "QPSK 8/9",
        required_es_n0_db: 6.20,
        spectral_efficiency: 1.766,
    },
    Modcod {
        name: "QPSK 9/10",
        required_es_n0_db: 6.42,
        spectral_efficiency: 1.789,
    },
];

// In lowest to highest data rate speed but decrement in reliability & robustness
// (Low data rate, more reliable) QPSK 1/4 < QPSK 1/3 < QPSK 2/5 < QPSK 1/2 < ..... < QPSK 9/10 (high data rate, less reliable)

pub fn select_modcod(es_n0_db: f64) -> Option<Modcod> {
    MODCOD_TABLE
        .iter()
        .copied()
        .filter(|modcod| es_n0_db >= modcod.required_es_n0_db)
        .last()
}

// The above function takes input es_n0_db and iterates through the MODCOD_TABLE,
// It searches the best data rate MODCOD that can be used for the given es_n0_db value.
// It returns the last MODCOD that satisfies the condition es_n0_db >= modcod.required_es_n0_db


#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn selects_highest_supported_modcod(){
        let result = select_modcod(3.5).unwrap();
        assert_eq!(result.name,"QPSK 2/3");
    }
    
    #[test]
    fn selects_most_robust_modcod(){
        let result = select_modcod(-2.0).unwrap();
        assert_eq!(result.name,"QPSK 1/4");
    }

    #[test]
    fn returns_none_when_link_is_too_weak(){
        let result = select_modcod(-3.0);
        assert!(result.is_none());
    }

    #[test]
    fn stronger_signal_selects_faster_modcod(){
        let weak = select_modcod(1.5).unwrap();
        let strong = select_modcod(6.5).unwrap();
        assert!(weak.spectral_efficiency < strong.spectral_efficiency);
    }
}