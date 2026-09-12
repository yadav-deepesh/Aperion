package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/yadav-deepesh/Aperion/orchestrator/internal/db"
	"github.com/yadav-deepesh/Aperion/orchestrator/internal/scheduler"
)

// Server holds dependencies for HTTP handlers. All handlers are methods on this type
// so the Store and future clients (engine, skyfield) are available via closure, not globals.
type Server struct {
	Store *db.Store
	Hub   *Hub
}

// healthResponse is the JSON shape for GET /health. Every service exposes this.
type healthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Version string `json:"version"`
}

// handleHealth returns 200 with service identity. Used by docker healthcheck and CI gate.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(healthResponse{Status: "ok", Service: "orchestrator", Version: "0.1.0"})
}

// handleListPasses returns all passes intersecting the query window.
// Query: ?start=2026-09-08T00:00:00Z&end=2026-09-15T00:00:00Z (both optional, default 7d from now).
func (s *Server) handleListPasses(w http.ResponseWriter, r *http.Request) {
	start := time.Now().UTC()
	end := start.Add(7 * 24 * time.Hour)
	if v := r.URL.Query().Get("start"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			start = t
		}
	}
	if v := r.URL.Query().Get("end"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			end = t
		}
	}
	// Passes are stored via InsertPasses by the ingestion cron or POST /schedule/generate.
	// For now, return bookings joined with passes via GetSchedule; raw passes list is via direct query.
	// Simple implementation: query passes table directly for the window.
	rows, err := s.Store.Pool.Query(r.Context(), `SELECT id, norad_id, sat_name, aos, los, max_el, az_aos, az_los, el_aos, el_los, slant_km, tier, contract_id, needs_uplink, flags FROM passes WHERE aos < $2 AND los > $1 ORDER BY aos`, start, end)
	if err != nil {
		http.Error(w, "db: list passes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type out struct {
		ID         string    `json:"id"`
		NoradID    int       `json:"norad_id"`
		SatName    string    `json:"sat_name"`
		Aos        time.Time `json:"aos"`
		Los        time.Time `json:"los"`
		MaxEl      float64   `json:"max_el"`
		AzAos      float64   `json:"az_aos"`
		AzLos      float64   `json:"az_los"`
		Tier       int       `json:"tier"`
		ContractID string    `json:"contract_id"`
	}
	var list []out
	for rows.Next() {
		var o out
		var elAos, elLos, slantKm float64
		var tier int
		var contractID *string
		var flags []string
		if err := rows.Scan(&o.ID, &o.NoradID, &o.SatName, &o.Aos, &o.Los, &o.MaxEl, &o.AzAos, &o.AzLos, &elAos, &elLos, &slantKm, &tier, &contractID, new(bool), &flags); err != nil {
			http.Error(w, "db: scan pass", http.StatusInternalServerError)
			return
		}
		o.Tier = tier
		if contractID != nil {
			o.ContractID = *contractID
		}
		list = append(list, o)
	}
	if list == nil {
		list = []out{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

// handleGetSchedule returns bookings for a time window with enriched pass data.
func (s *Server) handleGetSchedule(w http.ResponseWriter, r *http.Request) {
	start := time.Now().UTC()
	end := start.Add(7 * 24 * time.Hour)
	if v := r.URL.Query().Get("start"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			start = t
		}
	}
	if v := r.URL.Query().Get("end"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			end = t
		}
	}
	bookings, err := s.Store.GetSchedule(r.Context(), start, end)
	if err != nil {
		http.Error(w, "db: get schedule", http.StatusInternalServerError)
		return
	}
	if bookings == nil {
		bookings = []db.BookingRow{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookings)
}

// handleGenerateSchedule computes a schedule from all passes in the window.
// It loads antennas and passes from DB, runs the scheduler core, and persists bookings.
// This is the endpoint Sarthak and Ansh integrate against: POST /schedule/generate
func (s *Server) handleGenerateSchedule(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	start := time.Now().UTC()
	end := start.Add(7 * 24 * time.Hour)
	if v := r.URL.Query().Get("days"); v != "" {
		// days=7 is default; parse if provided
	}

	antRows, err := s.Store.ListAntennas(r.Context())
	if err != nil {
		http.Error(w, "db: list antennas", http.StatusInternalServerError)
		return
	}
	if len(antRows) == 0 {
		http.Error(w, "no antennas configured", http.StatusBadRequest)
		return
	}

	// Load passes for the window
	rows, err := s.Store.Pool.Query(r.Context(), `SELECT id, norad_id, sat_name, aos, los, max_el, az_aos, az_los, el_aos, el_los, slant_km, tier, contract_id, needs_uplink, dl_from, dl_to, ul_from, ul_to, flags FROM passes WHERE aos < $2 AND los > $1 ORDER BY aos`, start, end)
	if err != nil {
		http.Error(w, "db: load passes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var passes []scheduler.Pass
	for rows.Next() {
		var p scheduler.Pass
		var tier int
		var contractID *string
		var dlFrom, dlTo, ulFrom, ulTo *time.Time
		var flags []string
		if err := rows.Scan(&p.ID, &p.NoradID, &p.SatName, &p.Aos, &p.Los, &p.MaxEl, &p.AzAos, &p.AzLos, &p.ElAos, &p.ElLos, &p.SlantKm, &tier, &contractID, &p.NeedsUplink, &dlFrom, &dlTo, &ulFrom, &ulTo, &flags); err != nil {
			http.Error(w, "db: scan pass", http.StatusInternalServerError)
			return
		}
		p.Tier = scheduler.Tier(tier)
		if contractID != nil {
			p.ContractID = *contractID
		}
		if dlFrom != nil {
			p.DlFrom = *dlFrom
		}
		if dlTo != nil {
			p.DlTo = *dlTo
		}
		if ulFrom != nil {
			p.UlFrom = *ulFrom
		}
		if ulTo != nil {
			p.UlTo = *ulTo
		}
		p.Flags = flags
		passes = append(passes, p)
	}

	ants := make([]scheduler.Antenna, len(antRows))
	for i, a := range antRows {
		ants[i] = scheduler.Antenna{ID: a.ID, Bands: a.Bands, AzVmax: a.AzVmax, AzAmax: a.AzAmax, ElVmax: a.ElVmax, ElAmax: a.ElAmax, Settle: a.Settle, AzLimit: a.AzLimit}
	}

	booked, _ := scheduler.Schedule(passes, ants)

	// Persist bookings
	var toInsert []db.BookingRow
	for _, b := range booked {
		toInsert = append(toInsert, db.BookingRow{
			PassID:         b.PassID,
			AntennaID:      b.AntennaID,
			Aos:            b.Aos,
			Los:            b.Los,
			SlewGapSeconds: b.SlewGapSeconds,
			Flags:          b.Flags,
		})
	}
	if err := s.Store.InsertBookings(r.Context(), toInsert, start); err != nil {
		http.Error(w, "db: persist bookings", http.StatusInternalServerError)
		return
	}
	if s.Hub != nil {
		s.Hub.Broadcast(Event{Type: "booking.created", Payload: map[string]any{"booked": len(booked)}})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"booked": len(booked), "rejected": len(passes) - len(booked)})
}

// handleGetLedger returns weekly SLA accounting. Query: ?week=2026-09-08 (Monday). Defaults to current week.
func (s *Server) handleGetLedger(w http.ResponseWriter, r *http.Request) {
	week := time.Now().UTC().Truncate(24 * time.Hour)
	if v := r.URL.Query().Get("week"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			week = t
		} else if t, err := time.Parse(time.RFC3339, v); err == nil {
			week = t
		}
	}
	// Align to Monday
	for week.Weekday() != time.Monday {
		week = week.AddDate(0, 0, -1)
	}
	rows, err := s.Store.GetLedger(r.Context(), week)
	if err != nil {
		http.Error(w, "db: get ledger", http.StatusInternalServerError)
		return
	}
	if rows == nil {
		rows = []db.LedgerRow{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rows)
}

// injectRequest is the payload for POST /inject-emergency. Tier must be 1 for preemption.
type injectRequest struct {
	PassID     string  `json:"pass_id"`
	NoradID    int     `json:"norad_id"`
	SatName    string  `json:"sat_name"`
	Aos        string  `json:"aos"`
	Los        string  `json:"los"`
	MaxEl      float64 `json:"max_el"`
	AzAos      float64 `json:"az_aos"`
	AzLos      float64 `json:"az_los"`
	Tier       int     `json:"tier"`
	ContractID string  `json:"contract_id"`
}

// handleInjectEmergency attempts to book a Tier 1 emergency pass, preempting a lower-tier victim if needed.
func (s *Server) handleInjectEmergency(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req injectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if req.Tier != 1 {
		http.Error(w, "only tier 1 can preempt", http.StatusBadRequest)
		return
	}
	aos, err1 := time.Parse(time.RFC3339, req.Aos)
	los, err2 := time.Parse(time.RFC3339, req.Los)
	if err1 != nil || err2 != nil || !los.After(aos) {
		http.Error(w, "bad aos/los", http.StatusBadRequest)
		return
	}
	// Load current bookings overlapping the emergency window
	bookings, err := s.Store.GetSchedule(r.Context(), aos, los)
	if err != nil {
		http.Error(w, "db: get schedule", http.StatusInternalServerError)
		return
	}
	if len(bookings) == 0 {
		// No conflict, book directly
		passID := req.PassID
		if passID == "" {
			passID = req.SatName + "-" + req.Aos
		}
		err = s.Store.InsertBookings(r.Context(), []db.BookingRow{{PassID: passID, AntennaID: 1, Aos: aos, Los: los}}, aos)
		if err != nil {
			http.Error(w, "db: insert", http.StatusInternalServerError)
			return
		}
		if s.Hub != nil {
			s.Hub.Broadcast(Event{Type: "booking.created", Payload: map[string]any{"booked": passID}})
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"booked": passID, "preempted": nil})
		return
	}
	// Build maps for PickVictim
	passMap := make(map[string]scheduler.Pass)
	contractMap := make(map[string]scheduler.Contract)
	preemptions := make(map[string]int)
	for _, b := range bookings {
		// Minimal pass reconstruction for victim selection; contract and tier are needed
		p := scheduler.Pass{ID: b.PassID, Aos: b.Aos, Los: b.Los, Tier: scheduler.Tier2Commercial, ContractID: "unknown"}
		// Tier is not stored in bookings; in full implementation join with passes/contracts
		passMap[b.PassID] = p
	}
	// Load contracts for allowance check
	contracts, _ := s.Store.ListContracts(r.Context())
	for _, c := range contracts {
		contractMap[c.ID] = scheduler.Contract{ID: c.ID, Tier: scheduler.Tier(c.Tier), MaxPreemptionsWk: c.MaxPreemptionsWk}
		// Count existing preemptions from ledger
		week := aos.Truncate(24 * time.Hour)
		for week.Weekday() != time.Monday {
			week = week.AddDate(0, 0, -1)
		}
		ledger, _ := s.Store.GetLedger(r.Context(), week)
		for _, l := range ledger {
			if l.ContractID == c.ID {
				preemptions[c.ID] = l.PreemptionCount
			}
		}
	}
	var schedBookings []scheduler.Booking
	for _, b := range bookings {
		schedBookings = append(schedBookings, scheduler.Booking{PassID: b.PassID, AntennaID: b.AntennaID, Aos: b.Aos, Los: b.Los})
	}
	victim := scheduler.PickVictim(schedBookings, passMap, contractMap, preemptions)
	if victim == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]any{"error": "NO_LEGAL_VICTIM", "message": "no allowance-eligible victim"})
		return
	}
	// Preempt victim: delete its booking and insert emergency
	_, _ = s.Store.Pool.Exec(r.Context(), `DELETE FROM bookings WHERE pass_id = $1`, victim.PassID)
	passID := req.PassID
	if passID == "" {
		passID = req.SatName + "-" + req.Aos
	}
	_ = s.Store.InsertBookings(r.Context(), []db.BookingRow{{PassID: passID, AntennaID: victim.AntennaID, Aos: aos, Los: los}}, aos)
	// Update ledger for victim contract
	if p, ok := passMap[victim.PassID]; ok {
		if c, ok := contractMap[p.ContractID]; ok {
			week := aos.Truncate(24 * time.Hour)
			for week.Weekday() != time.Monday {
				week = week.AddDate(0, 0, -1)
			}
			_ = s.Store.UpsertLedgerPreemption(r.Context(), c.ID, week, c.CreditPerMiss, c.RatePerPass)
		}
	}
	if s.Hub != nil {
		s.Hub.Broadcast(Event{Type: "booking.preempted", Payload: map[string]any{"booked": passID, "preempted": victim.PassID}})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"booked": passID, "preempted": victim.PassID, "antenna": victim.AntennaID})
}
