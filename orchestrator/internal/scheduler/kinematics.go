package scheduler

import (
	"math"
	"time"
)

// AxisKinematics holds rate limits for one axis.
// Source: NRSC SGSS 7.5m specification — https://www.nrsc.gov.in/nrscnew/Services_SGSS_specification.php
type AxisKinematics struct {
	Vmax   float64 // deg/sec
	Amax   float64 // deg/sec^2
	Settle float64 // seconds for servo lock
}

// NRSC SGSS 7.5m kinematics. Do not float without citation.
var (
	AZ = AxisKinematics{Vmax: 20, Amax: 10, Settle: 1.0}
	EL = AxisKinematics{Vmax: 10, Amax: 2, Settle: 1.0}
)

// Azimuth travel limit per NRSC spec.
const AzLimit = 380.0

// Keyhole elevation cutoff. Passes above this are flagged KEYHOLE_RISK.
const KeyholeCutoffDeg = 85.0

// SlewTime returns seconds for the dish to rotate delta degrees on one axis.
// Trapezoidal profile: accelerate at Amax, coast at Vmax, decelerate, then settle.
// For short moves where max speed is never reached, triangular profile is used.
func SlewTime(delta float64, k AxisKinematics) float64 {
	if delta <= 0 {
		return 0
	}
	tAccel := k.Vmax / k.Amax
	dAccel := 0.5 * k.Amax * tAccel * tAccel
	if delta < 2*dAccel {
		return 2*math.Sqrt(delta/(2*k.Amax)) + k.Settle
	}
	dCoast := delta - 2*dAccel
	tCoast := dCoast / k.Vmax
	return 2*tAccel + tCoast + k.Settle
}

// AzDelta returns minimal slew angle between two azimuths for a ±380 deg travel-limited dish.
// A 350 deg raw difference is actually a 10 deg slew the other way.
func AzDelta(azA, azB float64) float64 {
	d := math.Abs(azB - azA)
	for d > 360 {
		d = math.Mod(d, 360)
	}
	if d > 180 {
		d = 360 - d
	}
	if d > AzLimit {
		d = AzLimit
	}
	return d
}

// CanFit reports whether the dish can slew from previous LOS position to next AOS in the available gap.
// Both axes are driven in parallel; the slower axis governs.
func CanFit(prevAzLos, prevElLos float64, next Pass, gapStart time.Time) bool {
	gap := next.Aos.Sub(gapStart).Seconds()
	if gap < 0 {
		return false
	}
	needAz := SlewTime(AzDelta(prevAzLos, next.AzAos), AZ)
	needEl := SlewTime(math.Abs(prevElLos-next.ElAos), EL)
	need := math.Max(needAz, needEl)
	return gap >= need
}

// SlewGap returns required slew seconds between a previous booking and next pass.
func SlewGap(prevAzLos, prevElLos float64, next Pass) float64 {
	needAz := SlewTime(AzDelta(prevAzLos, next.AzAos), AZ)
	needEl := SlewTime(math.Abs(prevElLos-next.ElAos), EL)
	return math.Max(needAz, needEl)
}

// IsKeyhole reports whether a pass peaks near zenith on an AZ-EL mount.
// Above cutoff the required azimuth rate diverges (NTIA TM-18-531).
func IsKeyhole(p Pass) bool {
	return p.MaxEl > KeyholeCutoffDeg
}

// RequiresUplinkWindow returns true if the uplink sub-window is long enough for a telecommand.
func RequiresUplinkWindow(p Pass, needSeconds float64) bool {
	if !p.NeedsUplink {
		return true
	}
	if p.UlFrom.IsZero() || p.UlTo.IsZero() {
		return false
	}
	return p.UlTo.Sub(p.UlFrom).Seconds() >= needSeconds
}

// UnwrapNear returns target azimuth unwrapped to be within ±180 deg of current continuous position.
// Use for tracking cable-wrap accumulation across a week-long sequence.
func UnwrapNear(currentUnwrapped, targetAz float64) float64 {
	delta := math.Mod(targetAz-currentUnwrapped+540, 360) - 180
	return currentUnwrapped + delta
}

// WrapOK reports whether an unwrapped azimuth is within the ±380 deg travel envelope.
func WrapOK(unwrapped float64) bool {
	return math.Abs(unwrapped) <= AzLimit
}
