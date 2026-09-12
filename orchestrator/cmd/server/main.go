package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/yadav-deepesh/Aperion/orchestrator/internal/api"
	"github.com/yadav-deepesh/Aperion/orchestrator/internal/db"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://aperion:localdev@localhost:5432/aperion?sslmode=disable"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()
	hub := api.NewHub()
	go hub.Run()

	store, err := db.New(ctx, dsn)
	if err != nil {
		log.Printf("db unavailable (%v) — starting without DB for health probe", err)
		// Health + WS still available without DB
		mux := http.NewServeMux()
		mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`{"status":"ok","service":"orchestrator","db":"waiting"}`))
		})
		mux.HandleFunc("/live", (&api.Server{Hub: hub}).ServeWS)
		log.Fatal(http.ListenAndServe(":"+port, mux))
	}
	defer store.Close()

	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Seed antennas and contracts if empty — idempotent
	seedAntennas(ctx, store)
	seedContracts(ctx, store)

	srv := &api.Server{Store: store, Hub: hub}
	handler := api.NewRouter(srv)

	log.Printf("orchestrator listening :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

func seedAntennas(ctx context.Context, store *db.Store) {
	ants, _ := store.ListAntennas(ctx)
	if len(ants) > 0 {
		return
	}
	// Two-antenna default: S/X and X/Ka. Kinematics from NRSC SGSS 7.5m spec.
	_, _ = store.Pool.Exec(ctx, `INSERT INTO antennas (id, name, bands, az_vmax, az_amax, el_vmax, el_amax, settle, az_limit)
		VALUES (1, 'Shadnagar-1', '{S,X}', 20, 10, 10, 2, 1.0, 380),
		       (2, 'Shadnagar-2', '{X,Ka}', 20, 10, 10, 2, 1.0, 380) ON CONFLICT (id) DO NOTHING`)
}

func seedContracts(ctx context.Context, store *db.Store) {
	contracts, _ := store.ListContracts(ctx)
	if len(contracts) > 0 {
		return
	}
	_, _ = store.Pool.Exec(ctx, `INSERT INTO contracts (id, customer, tier, min_passes_per_week, max_preemptions_wk, credit_per_miss, rate_per_pass)
		VALUES ('isro-1', 'ISRO/NSIL', 1, 0, 0, 0, 0),
		       ('pixxel-1', 'Pixxel', 2, 21, 2, 20000, 45000),
		       ('academic-1', 'Academic', 3, 0, 0, 0, 8000) ON CONFLICT (id) DO NOTHING`)
}
