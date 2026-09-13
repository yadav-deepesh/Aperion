package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// NewRouter wires all orchestrator HTTP routes. All routes are versioned under /api where applicable,
// but health and schedule endpoints are kept at root for docker healthchecks and frontend simplicity.
// It also wires CORS, Go→Rust link-budget proxy (/linkbudget) and optional static frontend serving
// so the orchestrator can serve the console at / when FE_DIR is set or frontend/ exists.
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
	mux.HandleFunc("/ledger", s.handleGetLedger)
	mux.HandleFunc("/inject-emergency", s.handleInjectEmergency)
	mux.HandleFunc("/live", s.ServeWS)

	// Link-budget proxy to Rust engine: canonical /linkbudget, aliases for frontend compat
	mux.HandleFunc("/linkbudget", s.handleLinkBudget)
	mux.HandleFunc("/api/linkbudget", s.handleLinkBudget)
	mux.HandleFunc("/compute", s.handleLinkBudget)

	// Optional static frontend — serves the new shell at frontend/index.html plus js/css
	// when the binary is run from repo root or FE_DIR is set.  API routes take precedence.
	feDir := os.Getenv("FE_DIR")
	if feDir == "" {
		// probe common locations
		for _, cand := range []string{"frontend", "../frontend", "../../frontend"} {
			if st, err := os.Stat(filepath.Join(cand, "index.html")); err == nil && !st.IsDir() {
				feDir = cand
				break
			}
		}
	}
	if feDir != "" {
		if st, err := os.Stat(feDir); err == nil && st.IsDir() {
			fileSrv := http.FileServer(http.Dir(feDir))
			mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
				// API/WS already matched; this is the SPA fallback
				if strings.HasPrefix(r.URL.Path, "/health") ||
					strings.HasPrefix(r.URL.Path, "/passes") ||
					strings.HasPrefix(r.URL.Path, "/schedule") ||
					strings.HasPrefix(r.URL.Path, "/ledger") ||
					strings.HasPrefix(r.URL.Path, "/inject") ||
					strings.HasPrefix(r.URL.Path, "/live") ||
					strings.HasPrefix(r.URL.Path, "/linkbudget") ||
					strings.HasPrefix(r.URL.Path, "/api/") ||
					strings.HasPrefix(r.URL.Path, "/compute") {
					http.NotFound(w, r)
					return
				}
				// Serve index.html for SPA routes, otherwise file server
				fp := filepath.Join(feDir, filepath.FromSlash(r.URL.Path))
				if st, err := os.Stat(fp); err != nil || st.IsDir() {
					http.ServeFile(w, r, filepath.Join(feDir, "index.html"))
					return
				}
				fileSrv.ServeHTTP(w, r)
			})
		}
	}

	return corsMiddleware(mux)
}
