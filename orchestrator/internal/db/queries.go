package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// ListAntennas retrieves all active ground station antennas.
func (s *Store) ListAntennas(ctx context.Context) ([]AntennaRow, error) {
	const query = `
		SELECT id, name, bands, az_vmax, az_amax, el_vmax, el_amax, settle, az_limit
		FROM antennas
		ORDER BY id
	`
	rows, err := s.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("db: list antennas: %w", err)
	}
	defer rows.Close()

	var antennas []AntennaRow
	for rows.Next() {
		var a AntennaRow
		if err := rows.Scan(
			&a.ID, &a.Name, &a.Bands, &a.AzVmax, &a.AzAmax,
			&a.ElVmax, &a.ElAmax, &a.Settle, &a.AzLimit,
		); err != nil {
			return nil, fmt.Errorf("db: scan antenna: %w", err)
		}
		antennas = append(antennas, a)
	}
	return antennas, rows.Err()
}

// ListContracts retrieves all active SLAs.
func (s *Store) ListContracts(ctx context.Context) ([]ContractRow, error) {
	const query = `
		SELECT id, customer, tier, min_passes_per_week, max_preemptions_wk, credit_per_miss, rate_per_pass
		FROM contracts
	`
	rows, err := s.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("db: list contracts: %w", err)
	}
	defer rows.Close()

	var contracts []ContractRow
	for rows.Next() {
		var c ContractRow
		if err := rows.Scan(
			&c.ID, &c.Customer, &c.Tier, &c.MinPassesPerWeek,
			&c.MaxPreemptionsWk, &c.CreditPerMiss, &c.RatePerPass,
		); err != nil {
			return nil, fmt.Errorf("db: scan contract: %w", err)
		}
		contracts = append(contracts, c)
	}
	return contracts, rows.Err()
}

// InsertPasses performs a bulk insert of visibility windows.
// Conflicting passes (by ID) are ignored to support idempotent cron ingestion.
func (s *Store) InsertPasses(ctx context.Context, passes []PassRow) (int64, error) {
	// pgx.CopyFrom requires a slice of slices, but CopyFrom doesn't support ON CONFLICT DO NOTHING natively.
	// For idempotent bulk insert in Postgres, we use an unnest query or a multi-value insert.
	// Given typical batch sizes (few thousand), a batch is efficient.
	batch := &pgx.Batch{}
	const query = `
		INSERT INTO passes (
			id, norad_id, sat_name, aos, los, max_el, az_aos, az_los, el_aos, el_los,
			slant_km, tier, contract_id, needs_uplink, dl_from, dl_to, ul_from, ul_to, flags
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19
		) ON CONFLICT (id) DO NOTHING
	`

	for _, p := range passes {
		batch.Queue(query,
			p.ID, p.NoradID, p.SatName, p.Aos, p.Los, p.MaxEl, p.AzAos, p.AzLos, p.ElAos, p.ElLos,
			p.SlantKm, p.Tier, p.ContractID, p.NeedsUplink, p.DlFrom, p.DlTo, p.UlFrom, p.UlTo, p.Flags,
		)
	}

	br := s.Pool.SendBatch(ctx, batch)
	defer br.Close()

	var inserted int64
	for i := 0; i < len(passes); i++ {
		ct, err := br.Exec()
		if err != nil {
			return inserted, fmt.Errorf("db: insert pass batch at index %d: %w", i, err)
		}
		inserted += ct.RowsAffected()
	}
	return inserted, nil
}

// InsertBookings drops existing future bookings for the time range and replaces them with the new schedule.
// Uses a transaction to ensure atomic schedule updates.
func (s *Store) InsertBookings(ctx context.Context, bookings []BookingRow, clearFrom time.Time) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("db: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Clear future bookings before inserting the newly computed schedule.
	const clearQuery = `DELETE FROM bookings WHERE aos >= $1`
	if _, err := tx.Exec(ctx, clearQuery, clearFrom); err != nil {
		return fmt.Errorf("db: clear bookings: %w", err)
	}

	// Bulk insert the new bookings.
	_, err = tx.CopyFrom(
		ctx,
		pgx.Identifier{"bookings"},
		[]string{"pass_id", "antenna_id", "aos", "los", "slew_gap_seconds", "preempted_by", "mbps", "modcod", "margin_db", "flags"},
		pgx.CopyFromSlice(len(bookings), func(i int) ([]any, error) {
			b := bookings[i]
			return []any{
				b.PassID, b.AntennaID, b.Aos, b.Los, b.SlewGapSeconds,
				b.PreemptedBy, b.Mbps, b.Modcod, b.MarginDb, b.Flags,
			}, nil
		}),
	)
	if err != nil {
		return fmt.Errorf("db: copyfrom bookings: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("db: commit bookings: %w", err)
	}
	return nil
}

// GetSchedule retrieves all bookings intersecting the specified time window.
func (s *Store) GetSchedule(ctx context.Context, start, end time.Time) ([]BookingRow, error) {
	const query = `
		SELECT id, pass_id, antenna_id, aos, los, slew_gap_seconds, preempted_by, mbps, modcod, margin_db, flags
		FROM bookings
		WHERE aos < $2 AND los > $1
		ORDER BY aos
	`
	rows, err := s.Pool.Query(ctx, query, start, end)
	if err != nil {
		return nil, fmt.Errorf("db: get schedule: %w", err)
	}
	defer rows.Close()

	var bookings []BookingRow
	for rows.Next() {
		var b BookingRow
		if err := rows.Scan(
			&b.ID, &b.PassID, &b.AntennaID, &b.Aos, &b.Los, &b.SlewGapSeconds,
			&b.PreemptedBy, &b.Mbps, &b.Modcod, &b.MarginDb, &b.Flags,
		); err != nil {
			return nil, fmt.Errorf("db: scan booking: %w", err)
		}
		bookings = append(bookings, b)
	}
	return bookings, rows.Err()
}
