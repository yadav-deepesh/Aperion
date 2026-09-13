package clients

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// RainRequest carries link geometry for attenuation lookup.
// R001 is the Hyderabad R0.01 rate in mm/h from config.
type RainRequest struct {
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	FreqGhz   float64 `json:"freq_ghz"`
	Elevation float64 `json:"elevation_deg"`
	HsKm      float64 `json:"hs_km"`
	P         float64 `json:"p"`
	R001      float64 `json:"r001_mmh"`
}

// RainClient queries the P.618 attenuation service.
type RainClient struct {
	base string
	http *http.Client
}

// NewRainClient builds a client for an addr like http://rain_svc:50053.
func NewRainClient(addr string) *RainClient {
	return &RainClient{
		base: strings.TrimRight(addr, "/"),
		http: &http.Client{Timeout: 15 * time.Second},
	}
}

// Attenuation returns rain attenuation in dB for the request.
func (c *RainClient) Attenuation(ctx context.Context, req RainRequest) (float64, error) {
	if req.FreqGhz <= 0 || req.Elevation <= 0 || req.Elevation > 90 {
		return 0, fmt.Errorf("clients: rain bad request freq=%v el=%v", req.FreqGhz, req.Elevation)
	}
	body, err := json.Marshal(req)
	if err != nil {
		return 0, fmt.Errorf("clients: rain marshal: %w", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.base+"/rain", bytes.NewReader(body))
	if err != nil {
		return 0, fmt.Errorf("clients: rain build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(httpReq)
	if err != nil {
		return 0, fmt.Errorf("clients: rain do: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("clients: rain status %d", resp.StatusCode)
	}
	var out struct {
		AttenuationDb float64 `json:"attenuation_db"`
		AttenuationD  float64 `json:"attenuation_dB"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return 0, fmt.Errorf("clients: rain decode: %w", err)
	}
	if out.AttenuationDb == 0 {
		out.AttenuationDb = out.AttenuationD
	}
	if out.AttenuationDb < 0 {
		return 0, fmt.Errorf("clients: rain negative attenuation %v", out.AttenuationDb)
	}
	return out.AttenuationDb, nil
}
