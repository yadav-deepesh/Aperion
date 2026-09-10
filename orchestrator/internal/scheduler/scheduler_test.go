package scheduler

import (
	"math"
	"testing"
	"time"
)

func TestSlewTime_Monotone(t *testing.T) {
	for _, d := range []float64{0, 5, 15, 40, 90, 180, 270} {
		a := SlewTime(d, AZ)
		b := SlewTime(d*1.5+1, AZ)
		if b < a {
			t.Fatalf("non-monotone: SlewTime(%v)=%v > %v", d, a, b)
		}
		if a < 0 {
			t.Fatalf("negative slew %v", a)
		}
	}
}

func TestAzDelta_Bounds(t *testing.T) {
	cases := [][2]float64{{10, 350}, {-370, 370}, {0, 180}, {0, 359}}
	for _, c := range cases {
		d := AzDelta(c[0], c[1])
		if d < 0 || d > AzLimit+1e-9 {
			t.Fatalf("AzDelta %v %v = %v out of [0,%.1f]", c[0], c[1], d, AzLimit)
		}
	}
	// 350 -> 10 should be 20 deg, not 340
	if math.Abs(AzDelta(350, 10)-20) > 1e-9 {
		t.Fatalf("wrap failed AzDelta 350->10 = %v", AzDelta(350, 10))
	}
}

func TestCanFit_SlewBlocked(t *testing.T) {
	prevAz, prevEl := 0.0, 20.0
	next := Pass{Aos: time.Unix(100, 0), AzAos: 180, ElAos: 20}
	// Need ~12s for 180 deg AZ; gap 5s should fail
	if CanFit(prevAz, prevEl, next, time.Unix(95, 0)) {
		t.Fatalf("expected SLEW_BLOCKED for 5s gap")
	}
	if !CanFit(prevAz, prevEl, next, time.Unix(80, 0)) {
		t.Fatalf("expected CanFit for 20s gap")
	}
}

func TestIsKeyhole(t *testing.T) {
	if !IsKeyhole(Pass{MaxEl: 86}) {
		t.Fatalf("86 deg should be keyhole")
	}
	if IsKeyhole(Pass{MaxEl: 84.9}) {
		t.Fatalf("84.9 deg should not be keyhole")
	}
}

func TestSchedule_NoOverlap(t *testing.T) {
	base := time.Unix(0, 0)
	p1 := Pass{ID: "a", Aos: base, Los: base.Add(6 * time.Minute), AzAos: 0, AzLos: 0, Tier: Tier2Commercial}
	p2 := Pass{ID: "b", Aos: base.Add(3 * time.Minute), Los: base.Add(9 * time.Minute), AzAos: 0, AzLos: 0, Tier: Tier2Commercial}
	ants := []Antenna{{ID: 1, AzVmax: 20, AzAmax: 10, ElVmax: 10, ElAmax: 2, Settle: 1, AzLimit: 380}}
	booked, _ := Schedule([]Pass{p1, p2}, ants)
	// p2 overlaps p1 on single antenna, so at most 1 booked
	if len(booked) > 1 {
		t.Fatalf("overlap: booked %d", len(booked))
	}
}

func TestWrapOK(t *testing.T) {
	if !WrapOK(0) || !WrapOK(380) || WrapOK(381) {
		t.Fatalf("wrap bounds failed")
	}
	uw := UnwrapNear(370, 10)
	if !WrapOK(uw) {
		t.Fatalf("unwrap 370->10 should stay within limit, got %v", uw)
	}
}
