package api

import "net/http"

// NewRouter wires all orchestrator HTTP routes. All routes are versioned under /api where applicable,
// but health and schedule endpoints are kept at root for docker healthchecks and frontend simplicity.
func NewRouter(s *Server) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/passes", s.handleListPasses)
	mux.HandleFunc("/schedule", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && r.URL.Path == "/schedule/generate" {
			s.handleGenerateSchedule(w, r)
			return
		}
		if r.Method == http.MethodGet {
			s.handleGetSchedule(w, r)
			return
		}
		http.Error(w, "not found", http.StatusNotFound)
	})
	mux.HandleFunc("/schedule/generate", s.handleGenerateSchedule)
	return mux
}
