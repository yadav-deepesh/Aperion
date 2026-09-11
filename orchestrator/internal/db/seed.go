package db

import (
	"context"
	"fmt"
)

// Seed inserts reference antennas and contracts. Skips rows that already exist
// (ON CONFLICT DO NOTHING) so it is safe to call on every startup after Migrate.
func (s *Store) Seed(ctx context.Context) error {
	for i, stmt := range seeds {
		if _, err := s.Pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("db: seed %d: %w", i, err)
		}
	}
	return nil
}

var seeds = []string{

	// ── Antennas ──────────────────────────────────────────────────────
	// Two NRSC SGSS 7.5m class dishes at Shadnagar.
	// Kinematics per the published specification:
	//   AZ: 20 deg/s max, 10 deg/s^2 accel
	//   EL: 10 deg/s max,  2 deg/s^2 accel
	//   Settle: 1.0 s servo lock
	//   Travel: ±380 deg azimuth (cable-wrap limit)
	// Source: https://www.nrsc.gov.in/nrscnew/Services_SGSS_specification.php
	`INSERT INTO antennas (id, name, bands, az_vmax, az_amax, el_vmax, el_amax, settle, az_limit)
	 VALUES
		(1, 'SGSS-A', ARRAY['S','X','Ka'], 20.0, 10.0, 10.0, 2.0, 1.0, 380.0),
		(2, 'SGSS-B', ARRAY['S','X','Ka'], 20.0, 10.0, 10.0, 2.0, 1.0, 380.0)
	 ON CONFLICT (id) DO NOTHING`,

	// ── Contracts ─────────────────────────────────────────────────────
	// Three seed contracts covering each SLA tier.
	//
	// ISRO Strategic (Tier 1): RISAT-2B flood response, defense imaging.
	//   Never preempted. Zero tolerance for missed passes.
	//   Rate reflects government allocation, not commercial pricing.
	//
	// Pixxel Commercial (Tier 2): hyperspectral constellation.
	//   Guaranteed 10 passes/week. Up to 2 preemptions allowed per week.
	//   Credit of 500 per missed pass beyond the allowance.
	//
	// Academic Opportunistic (Tier 3): university cubesats.
	//   Best-effort, no guarantees. Preempted freely.
	//   Low rate, no penalties.
	`INSERT INTO contracts (id, customer, tier, min_passes_per_week, max_preemptions_wk, credit_per_miss, rate_per_pass)
	 VALUES
		('isro-strategic',   'ISRO Defence & Disaster', 1, 14, 0,   0.0,  0.0),
		('pixxel-commercial', 'Pixxel Hyperspectral',   2, 10, 2, 500.0, 120.0),
		('academic-t3',       'University Cubesat Ops', 3,  0, 5,   0.0,  25.0)
	 ON CONFLICT (id) DO NOTHING`,
}
