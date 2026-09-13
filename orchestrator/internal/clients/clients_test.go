package clients

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestSkyfieldGetWindows(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"norad_id":44804,"sat":"CARTOSAT-3","aos":"2026-09-08T02:00:00Z","los":"2026-09-08T02:10:00Z","max_el":42.0,"az_aos":45.0,"az_los":135.0,"duration_s":600}]`))
	}))
	defer srv.Close()

	c := NewSkyfieldClient(srv.URL)
	windows, err := c.GetWindows(context.Background(), 7)
	if err != nil {
		t.Fatalf("GetWindows: %v", err)
	}
	if len(windows) != 1 {
		t.Fatalf("want 1 window, got %d", len(windows))
	}
	if windows[0].NoradID != 44804 {
		t.Fatalf("norad %d", windows[0].NoradID)
	}
	if !windows[0].Los.After(windows[0].Aos) {
		t.Fatalf("los before aos")
	}
}

func TestSkyfieldBadDays(t *testing.T) {
	c := NewSkyfieldClient("http://localhost:50052")
	if _, err := c.GetWindows(context.Background(), 0); err == nil {
		t.Fatalf("want error for days=0")
	}
}

func TestRainAttenuation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"attenuation_db":2.5}`))
	}))
	defer srv.Close()

	c := NewRainClient(srv.URL)
	got, err := c.Attenuation(context.Background(), RainRequest{Lat: 17.03, Lon: 78.18, FreqGhz: 26.0, Elevation: 45.0, HsKm: 0.54, P: 0.01, R001: 65.0})
	if err != nil {
		t.Fatalf("Attenuation: %v", err)
	}
	if got != 2.5 {
		t.Fatalf("want 2.5 got %v", got)
	}
}

func TestRainBadRequest(t *testing.T) {
	c := NewRainClient("http://localhost:50053")
	if _, err := c.Attenuation(context.Background(), RainRequest{FreqGhz: 0, Elevation: 45}); err == nil {
		t.Fatalf("want error for freq=0")
	}
}

func TestRunEveryRunsOnce(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	calls := 0
	_ = RunEvery(ctx, time.Hour, func(context.Context) error {
		calls++
		return nil
	})
	if calls != 1 {
		t.Fatalf("want 1 immediate call, got %d", calls)
	}
}

func TestEnginePingRefused(t *testing.T) {
	c := NewEngineClient("127.0.0.1:1")
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := c.Ping(ctx); err == nil {
		t.Fatalf("want error for closed port")
	}
}
