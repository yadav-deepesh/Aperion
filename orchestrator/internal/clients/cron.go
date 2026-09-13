package clients

import (
	"context"
	"time"
)

// RunEvery runs fn immediately, then on every tick of interval until ctx is done.
// Used for the 6h TLE ingestion cron. Interval must be positive.
func RunEvery(ctx context.Context, interval time.Duration, fn func(context.Context) error) error {
	if interval <= 0 {
		interval = 6 * time.Hour
	}
	if err := fn(ctx); err != nil {
		return err
	}
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			_ = fn(ctx)
		}
	}
}
