package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store wraps a pgx connection pool. All database access goes through this type.
type Store struct {
	Pool *pgxpool.Pool
}

// New creates a connection pool from a Postgres DSN and verifies connectivity.
// Caller must call Close when the store is no longer needed.
func New(ctx context.Context, dsn string) (*Store, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("db: parse dsn: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("db: connect: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db: ping: %w", err)
	}

	return &Store{Pool: pool}, nil
}

// Close releases all pooled connections.
func (s *Store) Close() {
	s.Pool.Close()
}
