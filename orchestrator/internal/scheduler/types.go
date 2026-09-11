package scheduler

import "time"

// Tier defines contract priority. Tier 1 is never preempted.
type Tier int

const (
	Tier1Strategic   Tier = 1
	Tier2Commercial  Tier = 2
	Tier3Opportunistic Tier = 3
)

// Pass is a visibility window from the skyfield service.
type Pass struct {
	ID        string
	NoradID   int
	SatName   string
	Aos       time.Time
	Los       time.Time
	MaxEl     float64
	AzAos     float64
	AzLos     float64
	ElAos     float64
	ElLos     float64
	SlantKm   float64
	Tier      Tier
	ContractID string
	NeedsUplink bool
	DlFrom    time.Time
	DlTo      time.Time
	UlFrom    time.Time
	UlTo      time.Time
	Flags     []string
}

// Antenna configuration. Values from NRSC SGSS 7.5m spec.
type Antenna struct {
	ID       int
	Bands    []string
	AzVmax   float64
	AzAmax   float64
	ElVmax   float64
	ElAmax   float64
	Settle   float64
	AzLimit  float64
}

// Booking is a scheduled assignment of a Pass to an Antenna.
type Booking struct {
	PassID         string
	AntennaID      int
	Aos            time.Time
	Los            time.Time
	SlewGapSeconds float64
	PreemptedBy    string
	Flags          []string
}

// Contract holds SLA terms per customer.
type Contract struct {
	ID               string
	Customer         string
	Tier             Tier
	MinPassesPerWeek int
	MaxPreemptionsWk int
	CreditPerMiss    float64
	RatePerPass      float64
}
