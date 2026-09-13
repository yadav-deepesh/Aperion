package clients

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"
)

// BudgetRequest carries per-pass geometry for the link engine.
// Field names match engine/proto/engine.proto ComputeBudget.
type BudgetRequest struct {
	FreqGhz          float64
	SlantRangeKm     float64
	ElevationDeg     float64
	EirpSatDbm       float64
	GGroundDb        float64
	TsysK            float64
	RainRate001      float64
	StationAltKm     float64
	ExclusionKm      float64
	RainNowMmh       float64
	FilterRejDb      float64
}

// BudgetResponse carries the per-term decomposition for the waterfall chart.
type BudgetResponse struct {
	FsplDb   float64
	ARainDb  float64
	AGasDb   float64
	ACloudDb float64
	AScintDb float64
	LPointDb float64
	I5gDbm   float64
	N0Dbm    float64
	PrDbm    float64
	Cn0Dbhz  float64
	Modcod   string
	Mbps     float64
	MarginDb float64
}

// EngineClient dials the Rust link engine (tonic gRPC on :50051).
// The generated protobuf client lands with the proto freeze; until then
// this type owns the address, dial, and health check so callers do not change.
type EngineClient struct {
	addr    string
	timeout time.Duration
}

// NewEngineClient builds a client for an addr like engine:50051.
func NewEngineClient(addr string) *EngineClient {
	addr = strings.TrimPrefix(addr, "http://")
	addr = strings.TrimPrefix(addr, "https://")
	return &EngineClient{addr: addr, timeout: 5 * time.Second}
}

// Ping verifies TCP reachability. Full ComputeBudget RPC is wired once
// engine/proto/engine.proto is generated into Go.
func (c *EngineClient) Ping(ctx context.Context) error {
	d := net.Dialer{Timeout: c.timeout}
	conn, err := d.DialContext(ctx, "tcp", c.addr)
	if err != nil {
		return fmt.Errorf("clients: engine ping %s: %w", c.addr, err)
	}
	_ = conn.Close()
	return nil
}
