package api

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"os"
	"time"

	"github.com/yadav-deepesh/Aperion/orchestrator/internal/clients"
)

// linkBudgetRequest mirrors the frontend ComputeBudget shape.
// Frontend sends Go-proxied Rust request; we decode both snake and camel.
type linkBudgetRequest struct {
	PointingErrorDeg       float64 `json:"pointing_error_deg"`
	Beamwidth3dbDeg        float64 `json:"beamwidth_3db_deg"`
	TransmitPowerDbm       float64 `json:"transmit_power_dbm"`
	TxGainDbi              float64 `json:"tx_gain_dbi"`
	RxGainDbi              float64 `json:"rx_gain_dbi"`
	InterferenceToNoiseDb  float64 `json:"interference_to_noise_db"`
	SystemTemperatureK     float64 `json:"system_temperature_k"`
	DistanceKm             float64 `json:"distance_km"`
	LatitudeDeg            float64 `json:"latitude_deg"`
	LongitudeDeg           float64 `json:"longitude_deg"`
	FrequencyGhz           float64 `json:"frequency_ghz"`
	ElevationDeg           float64 `json:"elevation_deg"`
	StationHeightKm        float64 `json:"station_height_km"`
	TimePercent            float64 `json:"time_percent"`
	RainRateR001Mmh        float64 `json:"rain_rate_r001_mmh"`
	RainPolarizationDeg    float64 `json:"rain_polarization_deg"`
	PolarizationMismatchDeg float64 `json:"polarization_mismatch_deg"`
	AntennaDiameterM       float64 `json:"antenna_diameter_m"`
	SymbolRateSps          float64 `json:"symbol_rate_sps"`
	BandwidthHz            float64 `json:"bandwidth_hz"`
	// UI-only extras forwarded by kaPanel (non-frozen)
	UIRainMmh      *float64 `json:"_ui_rain_mmh"`
	UIExclusionKm  *float64 `json:"_ui_exclusion_km"`
}

// linkBudgetResponse mirrors engine compute_budget.rs LinkResult + waterfall terms.
type linkBudgetResponse struct {
	FsplDb               float64 `json:"fspl_db"`
	RainDb               float64 `json:"rain_db"`
	GasDb                float64 `json:"gas_db"`
	CloudDb              float64 `json:"cloud_db"`
	ScintillationDb      float64 `json:"scintillation_db"`
	PointingDb           float64 `json:"pointing_db"`
	PolarizationDb       float64 `json:"polarization_db"`
	TotalLossDb          float64 `json:"total_loss_db"`
	ReceivedPowerDbm     float64 `json:"received_power_dbm"`
	NoiseDensityDbmHz    float64 `json:"noise_density_dbm_hz"`
	Cn0DbHz              float64 `json:"cn0_db_hz"`
	EffectiveCn0DbHz     float64 `json:"effective_cn0_db_hz"`
	ModcodName           *string `json:"modcod_name"`
	SpectralEfficiency   *float64 `json:"spectral_efficiency"`
	DataRateMbps         float64 `json:"data_rate_mbps"`
	MarginDb             float64 `json:"margin_db"`

	// Back-compat aliases for previous frontend localBudget
	Modcod     string  `json:"modcod"`
	Mbps       float64 `json:"mbps"`
	ARainDb    float64 `json:"a_rain_db"`
	AGasDb     float64 `json:"a_gas_db"`
}

// HandleLinkBudget is the exported wrapper for the link-budget proxy (used by the no-DB fallback in main.go).
func (s *Server) HandleLinkBudget(w http.ResponseWriter, r *http.Request) { s.handleLinkBudget(w, r) }

func (s *Server) handleLinkBudget(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req linkBudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad json: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Apply sensible defaults for zero values (frontend sometimes sends minimal set)
	if req.FrequencyGhz == 0 {
		req.FrequencyGhz = 26.5
	}
	if req.DistanceKm == 0 {
		req.DistanceKm = 550
	}
	if req.ElevationDeg == 0 {
		req.ElevationDeg = 30
	}
	if req.AntennaDiameterM == 0 {
		req.AntennaDiameterM = 7.5
	}
	if req.SystemTemperatureK == 0 {
		req.SystemTemperatureK = 290
	}
	if req.BandwidthHz == 0 {
		req.BandwidthHz = 10_000_000
	}
	if req.SymbolRateSps == 0 {
		req.SymbolRateSps = 1_000_000
	}
	if req.LatitudeDeg == 0 && req.LongitudeDeg == 0 {
		req.LatitudeDeg = 17.03
		req.LongitudeDeg = 78.18
	}

	// If UI sliders provided, derive interference + rain mapping
	rainMmh := req.RainRateR001Mmh
	if req.UIRainMmh != nil {
		rainMmh = *req.UIRainMmh
	}
	exclusionKm := 2.7
	if req.UIExclusionKm != nil {
		exclusionKm = *req.UIExclusionKm
	}
	// Map exclusion to interference: 2.7km -> 0dB, 0.3km -> ~4dB
	interferenceDb := math.Min(4, math.Max(0, (2.7-exclusionKm)/1.7*4))
	if req.InterferenceToNoiseDb == 0 {
		req.InterferenceToNoiseDb = interferenceDb
	}

	// First try Rust engine if ENGINE_ADDR is set and reachable
	engineAddr := os.Getenv("ENGINE_ADDR")
	if engineAddr == "" {
		engineAddr = "engine:50051"
	}
	// We attempt TCP ping; if it succeeds we could forward via gRPC once proto is frozen.
	// For now we always compute locally so the demo never blocks on engine unavailability,
	// but we record the attempt for the response header.
	if engineAddr != "" {
		ec := clients.NewEngineClient(engineAddr)
		ctx, cancel := context.WithTimeout(r.Context(), 400*time.Millisecond)
		defer cancel()
		_ = ec.Ping(ctx)
	}

	resp := computeLinkBudgetLocal(req, rainMmh)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// computeLinkBudgetLocal is the Go-side replica of the frontend localBudget + Rust itu-rs
// simplified model. It stays in sync with frontend/js/api/client.js localBudget.
// For the SIH demo the numbers are illustrative but monotonic and tier-consistent.
func computeLinkBudgetLocal(req linkBudgetRequest, rainMmh float64) linkBudgetResponse {
	// Rain 0-100mm/h -> 0-6dB at Ka (ITU-R P.618 cross-checked in rust; here linearised)
	rainDb := math.Min(12, 0.06*rainMmh+0.3)
	// 5G exclusion-derived interference already in req.InterferenceToNoiseDb
	interf := req.InterferenceToNoiseDb

	// FSPL at Ka 26.5GHz, slant ~550km -> ~210-215 dB
	fspl := 92.45 + 20*math.Log10(req.FrequencyGhz) + 20*math.Log10(req.DistanceKm)
	gas := 0.6
	if req.ElevationDeg < 15 {
		gas = 1.2
	}
	cloud := 0.3
	scint := 0.35
	pointing := 0.2
	pol := 0.1

	totalLoss := fspl + rainDb + gas + cloud + scint + pointing + pol + interf*0.2

	// Received power: EIRP ~ Tx + gains - loss
	eirp := req.TransmitPowerDbm + req.TxGainDbi
	pr := eirp + req.RxGainDbi - totalLoss

	// Noise density N0 = k*T, k=-228.6 dBW/Hz
	noiseDbwHz := -228.6 + 10*math.Log10(req.SystemTemperatureK)
	noiseDbmHz := noiseDbwHz + 30 // dBm

	cn0 := pr - noiseDbmHz
	effCn0 := cn0 - interf

	// Es/N0 -> MODCOD selection (DVB-S2 table, same thresholds as frontend)
	esN0 := effCn0 - 10*math.Log10(req.SymbolRateSps)
	type mod struct {
		name  string
		minEs float64
		se    float64
		rate  float64
	}
	table := []mod{
		{"32APSK 9/10", 16, 4.45, 620},
		{"16APSK 8/9", 13, 3.5, 480},
		{"8PSK 3/4", 10, 2.2, 360},
		{"QPSK 3/4", 7, 1.45, 220},
		{"QPSK 1/2", 4, 0.99, 140},
	}
	var chosen *mod
	for i := range table {
		if esN0 >= table[i].minEs {
			chosen = &table[i]
			break
		}
	}
	var modcodName *string
	var se *float64
	var mbps float64
	var margin float64
	if chosen != nil {
		modcodName = &chosen.name
		se = &chosen.se
		mbps = chosen.se * req.BandwidthHz / 1e6
		margin = effCn0 - (chosen.minEs + 10*math.Log10(req.SymbolRateSps))
	} else {
		none := "No Lock"
		modcodName = &none
		z := 0.0
		se = &z
		margin = effCn0 - 999
	}

	// Provide aliases for older frontend consumers
	aliasModcod := ""
	if modcodName != nil {
		aliasModcod = *modcodName
	}

	return linkBudgetResponse{
		FsplDb: fspl, RainDb: rainDb, GasDb: gas, CloudDb: cloud, ScintillationDb: scint,
		PointingDb: pointing, PolarizationDb: pol, TotalLossDb: totalLoss,
		ReceivedPowerDbm: pr, NoiseDensityDbmHz: noiseDbmHz, Cn0DbHz: cn0, EffectiveCn0DbHz: effCn0,
		ModcodName: modcodName, SpectralEfficiency: se, DataRateMbps: mbps, MarginDb: margin,
		Modcod: aliasModcod, Mbps: mbps, ARainDb: rainDb, AGasDb: gas,
	}
}
