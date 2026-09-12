package db

import (
	"context"
	"fmt"
	"time"
)

// LedgerRow mirrors ledger_weekly.
type LedgerRow struct {
	ContractID       string
	WeekStart        time.Time
	PassesBooked     int
	PassesCompleted  int
	PassesMissed     int
	PassesPreempted  int
	PreemptionCount  int
	CreditsOwed      float64
	Revenue          float64
}

// GetLedger returns weekly rows for all contracts intersecting the window.
// Week is Monday 00:00 UTC.
func (s *Store) GetLedger(ctx context.Context, weekStart time.Time) ([]LedgerRow, error) {
	weekStart = weekStart.UTC().Truncate(24 * time.Hour)
	const q = `SELECT contract_id, week_start, passes_booked, passes_completed, passes_missed, passes_preempted, preemption_count, credits_owed, revenue
	           FROM ledger_weekly WHERE week_start = $1 ORDER BY contract_id`
	rows, err := s.Pool.Query(ctx, q, weekStart)
	if err != nil {
		return nil, fmt.Errorf("db: get ledger: %w", err)
	}
	defer rows.Close()
	var out []LedgerRow
	for rows.Next() {
		var r LedgerRow
		if err := rows.Scan(&r.ContractID, &r.WeekStart, &r.PassesBooked, &r.PassesCompleted, &r.PassesMissed, &r.PassesPreempted, &r.PreemptionCount, &r.CreditsOwed, &r.Revenue); err != nil {
			return nil, fmt.Errorf("db: scan ledger: %w", err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// UpsertLedger increments preemption and credit counters for a contract.
// Called after a successful preemption. Week is Monday of the pass AOS.
func (s *Store) UpsertLedgerPreemption(ctx context.Context, contractID string, weekStart time.Time, credit float64, rate float64) error {
	weekStart = weekStart.UTC().Truncate(24 * time.Hour)
	const q = `
		INSERT INTO ledger_weekly (contract_id, week_start, passes_booked, passes_preempted, preemption_count, credits_owed, revenue)
		VALUES ($1, $2, 1, 1, 1, $3, $4)
		ON CONFLICT (contract_id, week_start) DO UPDATE SET
			passes_preempted = ledger_weekly.passes_preempted + 1,
			preemption_count = ledger_weekly.preemption_count + 1,
			credits_owed = ledger_weekly.credits_owed + EXCLUDED.credits_owed,
			revenue = ledger_weekly.revenue + EXCLUDED.revenue
	`
	_, err := s.Pool.Exec(ctx, q, contractID, weekStart, credit, rate)
	if err != nil {
		return fmt.Errorf("db: upsert ledger preemption: %w", err)
	}
	return nil
}
