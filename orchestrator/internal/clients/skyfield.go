package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Window is a single visibility window returned by the orbit service.
type Window struct {
	NoradID   int
	SatName   string
	Aos       time.Time
	Los       time.Time
	MaxEl     float64
	AzAos     float64
	AzLos     float64
	ElAos     float64
	ElLos     float64
	SlantKm   float64
	DurationS float64
}

// SkyfieldClient queries the orbit propagation service.
type SkyfieldClient struct {
	base string
	http *http.Client
}

// NewSkyfieldClient builds a client for an addr like http://skyfield_svc:50052.
func NewSkyfieldClient(addr string) *SkyfieldClient {
	return &SkyfieldClient{
		base: strings.TrimRight(addr, "/"),
		http: &http.Client{Timeout: 30 * time.Second},
	}
}

type skyfieldWindow struct {
	NoradID   int     `json:"norad_id"`
	SatName   string  `json:"sat"`
	Sat       string  `json:"sat_name"`
	Aos       string  `json:"aos"`
	Los       string  `json:"los"`
	MaxEl     float64 `json:"max_el"`
	AzAos     float64 `json:"az_aos"`
	AzLos     float64 `json:"az_los"`
	ElAos     float64 `json:"el_aos"`
	ElLos     float64 `json:"el_los"`
	SlantKm   float64 `json:"slant_range_km"`
	RangeKm   float64 `json:"range_km"`
	DurationS float64 `json:"duration_s"`
}

// GetWindows fetches visibility windows for the next days days.
func (c *SkyfieldClient) GetWindows(ctx context.Context, days int) ([]Window, error) {
	if days <= 0 || days > 14 {
		return nil, fmt.Errorf("clients: skyfield days out of range [1,14]: %d", days)
	}
	u, err := url.Parse(c.base + "/passes")
	if err != nil {
		return nil, fmt.Errorf("clients: skyfield parse base: %w", err)
	}
	q := u.Query()
	q.Set("days", strconv.Itoa(days))
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("clients: skyfield build request: %w", err)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("clients: skyfield do: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("clients: skyfield status %d", resp.StatusCode)
	}
	var raw []skyfieldWindow
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("clients: skyfield decode: %w", err)
	}
	out := make([]Window, 0, len(raw))
	for i, r := range raw {
		aos, err := time.Parse(time.RFC3339, r.Aos)
		if err != nil {
			return nil, fmt.Errorf("clients: skyfield window %d bad aos: %w", i, err)
		}
		los, err := time.Parse(time.RFC3339, r.Los)
		if err != nil {
			return nil, fmt.Errorf("clients: skyfield window %d bad los: %w", i, err)
		}
		if !los.After(aos) {
			return nil, fmt.Errorf("clients: skyfield window %d los before aos", i)
		}
		name := r.SatName
		if name == "" {
			name = r.Sat
		}
		slant := r.SlantKm
		if slant == 0 {
			slant = r.RangeKm
		}
		out = append(out, Window{
			NoradID:   r.NoradID,
			SatName:   name,
			Aos:       aos.UTC(),
			Los:       los.UTC(),
			MaxEl:     r.MaxEl,
			AzAos:     r.AzAos,
			AzLos:     r.AzLos,
			ElAos:     r.ElAos,
			ElLos:     r.ElLos,
			SlantKm:   slant,
			DurationS: r.DurationS,
		})
	}
	return out, nil
}
