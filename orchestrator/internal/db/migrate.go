package db

import (
	"context"
	"fmt"
)

// Migrate creates all tables idempotently. Safe to call on every startup.
func (s *Store) Migrate(ctx context.Context) error {
	for i, stmt := range migrations {
		if _, err := s.Pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("db: migration %d: %w", i, err)
		}
	}
	return nil
}

var migrations = []string{

	// ── antennas ───────────────────────────────────────────────────────
	// Kinematics sourced from NRSC SGSS 7.5m specification.
	// az_vmax/az_amax/el_vmax/el_amax in deg/sec and deg/sec^2.
	// settle is servo lock time in seconds.
	// az_limit is the cable-wrap travel envelope in degrees (±).
	`CREATE TABLE IF NOT EXISTS antennas (
		id          INTEGER PRIMARY KEY,
		name        TEXT    NOT NULL,
		bands       TEXT[]  NOT NULL DEFAULT '{}',
		az_vmax     DOUBLE PRECISION NOT NULL,
		az_amax     DOUBLE PRECISION NOT NULL,
		el_vmax     DOUBLE PRECISION NOT NULL,
		el_amax     DOUBLE PRECISION NOT NULL,
		settle      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
		az_limit    DOUBLE PRECISION NOT NULL DEFAULT 380.0,
		created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
	)`,

	// ── contracts ─────────────────────────────────────────────────────
	// SLA terms per customer. tier: 1 = strategic (never preempted),
	// 2 = commercial, 3 = opportunistic.
	`CREATE TABLE IF NOT EXISTS contracts (
		id                  TEXT             PRIMARY KEY,
		customer            TEXT             NOT NULL,
		tier                INTEGER          NOT NULL CHECK (tier BETWEEN 1 AND 3),
		min_passes_per_week INTEGER          NOT NULL DEFAULT 0,
		max_preemptions_wk  INTEGER          NOT NULL DEFAULT 0,
		credit_per_miss     DOUBLE PRECISION NOT NULL DEFAULT 0,
		rate_per_pass       DOUBLE PRECISION NOT NULL DEFAULT 0,
		created_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
	)`,

	// ── passes ────────────────────────────────────────────────────────
	// Visibility windows from skyfield_svc. One row per satellite per pass.
	// dl_from/dl_to: downlink-capable sub-window (receive mask, lower elevation).
	// ul_from/ul_to: uplink-capable sub-window (transmit mask, higher elevation).
	`CREATE TABLE IF NOT EXISTS passes (
		id          TEXT             PRIMARY KEY,
		norad_id    INTEGER          NOT NULL,
		sat_name    TEXT             NOT NULL DEFAULT '',
		aos         TIMESTAMPTZ      NOT NULL,
		los         TIMESTAMPTZ      NOT NULL,
		max_el      DOUBLE PRECISION NOT NULL,
		az_aos      DOUBLE PRECISION NOT NULL,
		az_los      DOUBLE PRECISION NOT NULL,
		el_aos      DOUBLE PRECISION NOT NULL DEFAULT 0,
		el_los      DOUBLE PRECISION NOT NULL DEFAULT 0,
		slant_km    DOUBLE PRECISION NOT NULL DEFAULT 0,
		tier        INTEGER          NOT NULL DEFAULT 3,
		contract_id TEXT             REFERENCES contracts(id),
		needs_uplink BOOLEAN         NOT NULL DEFAULT false,
		dl_from     TIMESTAMPTZ,
		dl_to       TIMESTAMPTZ,
		ul_from     TIMESTAMPTZ,
		ul_to       TIMESTAMPTZ,
		flags       TEXT[]           NOT NULL DEFAULT '{}',
		created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
	)`,

	`CREATE INDEX IF NOT EXISTS idx_passes_aos ON passes (aos)`,
	`CREATE INDEX IF NOT EXISTS idx_passes_norad ON passes (norad_id)`,

	// ── bookings ──────────────────────────────────────────────────────
	// Output of the scheduler. One booking per pass assignment.
	// preempted_by: pass_id of the Tier 1 pass that displaced this booking, or NULL.
	// mbps/modcod/margin_db: link budget results from the Rust engine, filled post-schedule.
	`CREATE TABLE IF NOT EXISTS bookings (
		id                SERIAL           PRIMARY KEY,
		pass_id           TEXT             NOT NULL REFERENCES passes(id),
		antenna_id        INTEGER          NOT NULL REFERENCES antennas(id),
		aos               TIMESTAMPTZ      NOT NULL,
		los               TIMESTAMPTZ      NOT NULL,
		slew_gap_seconds  DOUBLE PRECISION NOT NULL DEFAULT 0,
		preempted_by      TEXT,
		mbps              DOUBLE PRECISION,
		modcod            TEXT,
		margin_db         DOUBLE PRECISION,
		flags             TEXT[]           NOT NULL DEFAULT '{}',
		created_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
		UNIQUE(pass_id, antenna_id)
	)`,

	`CREATE INDEX IF NOT EXISTS idx_bookings_antenna_aos ON bookings (antenna_id, aos)`,

	// ── ledger_weekly ─────────────────────────────────────────────────
	// Per-contract weekly SLA accounting. Updated after each scheduling run
	// and after each preemption event.
	`CREATE TABLE IF NOT EXISTS ledger_weekly (
		id                SERIAL           PRIMARY KEY,
		contract_id       TEXT             NOT NULL REFERENCES contracts(id),
		week_start        DATE             NOT NULL,
		passes_booked     INTEGER          NOT NULL DEFAULT 0,
		passes_completed  INTEGER          NOT NULL DEFAULT 0,
		passes_missed     INTEGER          NOT NULL DEFAULT 0,
		passes_preempted  INTEGER          NOT NULL DEFAULT 0,
		preemption_count  INTEGER          NOT NULL DEFAULT 0,
		credits_owed      DOUBLE PRECISION NOT NULL DEFAULT 0,
		revenue           DOUBLE PRECISION NOT NULL DEFAULT 0,
		created_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
		UNIQUE(contract_id, week_start)
	)`,
}
