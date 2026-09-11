package db

import (
	"time"
)

// AntennaRow represents a physical ground station antenna and its kinematic limits.
type AntennaRow struct {
	ID      int
	Name    string
	Bands   []string
	AzVmax  float64
	AzAmax  float64
	ElVmax  float64
	ElAmax  float64
	Settle  float64
	AzLimit float64
}

// ContractRow represents an SLA with a customer.
type ContractRow struct {
	ID               string
	Customer         string
	Tier             int
	MinPassesPerWeek int
	MaxPreemptionsWk int
	CreditPerMiss    float64
	RatePerPass      float64
}

// PassRow represents a satellite visibility window.
type PassRow struct {
	ID          string
	NoradID     int
	SatName     string
	Aos         time.Time
	Los         time.Time
	MaxEl       float64
	AzAos       float64
	AzLos       float64
	ElAos       float64
	ElLos       float64
	SlantKm     float64
	Tier        int
	ContractID  string
	NeedsUplink bool
	DlFrom      *time.Time
	DlTo        *time.Time
	UlFrom      *time.Time
	UlTo        *time.Time
	Flags       []string
}

// BookingRow represents a scheduled pass on a specific antenna.
type BookingRow struct {
	ID             int
	PassID         string
	AntennaID      int
	Aos            time.Time
	Los            time.Time
	SlewGapSeconds float64
	PreemptedBy    *string
	Mbps           *float64
	Modcod         *string
	MarginDb       *float64
	Flags          []string
}
