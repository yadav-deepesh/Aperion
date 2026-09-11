package scheduler

import (
	"sort"
	"time"
)

// Schedule assigns passes to antennas respecting slew, keyhole, masks and tier priority.
// Input passes are assumed to have DlFrom/DlTo and UlFrom/UlTo already computed.
// Returns bookings sorted by AOS. Passes that cannot be placed are returned as rejected with reason.
type Rejected struct {
	Pass   Pass
	Reason string
}

// Schedule runs greedy assignment: passes sorted by AOS, tier desc, then try each antenna in order.
// For single-antenna optimality, caller can pre-sort by LOS for DP; this greedy covers k=2–3 near-optimally.
func Schedule(passes []Pass, antennas []Antenna) (booked []Booking, rejected []Rejected) {
	if len(antennas) == 0 {
		for _, p := range passes {
			rejected = append(rejected, Rejected{Pass: p, Reason: "NO_CAPACITY"})
		}
		return
	}

	// Stable sort: tier priority first, then earliest AOS. Within tier, earlier AOS wins.
	sort.SliceStable(passes, func(i, j int) bool {
		if passes[i].Tier != passes[j].Tier {
			return passes[i].Tier < passes[j].Tier
		}
		return passes[i].Aos.Before(passes[j].Aos)
	})

	// Track per-antenna state: last LOS position and time, and unwrapped azimuth.
	type antState struct {
		ant      Antenna
		lastAos  time.Time
		lastLos  time.Time
		lastAz   float64
		lastEl   float64
		azUnwrap float64
		bookings []Booking
	}
	states := make([]*antState, len(antennas))
	for i, a := range antennas {
		states[i] = &antState{ant: a, azUnwrap: 0}
	}

	for _, p := range passes {
		// Keyhole demotion: still schedule but mark. If caller wants to forbid Tier 1/2 keyhole, handle outside.
		flags := p.Flags
		if IsKeyhole(p) {
			flags = append(flags, "KEYHOLE_RISK")
			// Downgrade opportunistic is policy; scheduler does not silently change tier, but flags it.
		}

		placed := false
		for _, st := range states {
			if len(st.bookings) == 0 {
				// First booking on this antenna — check UL if needed.
				if p.NeedsUplink && !RequiresUplinkWindow(p, 60) {
					continue
				}
				// Wrap check from home (0)
				uw := UnwrapNear(st.azUnwrap, p.AzAos)
				if !WrapOK(uw) {
					continue
				}
				b := Booking{
					PassID:    p.ID,
					AntennaID: st.ant.ID,
					Aos:       p.Aos,
					Los:       p.Los,
					Flags:     flags,
				}
				st.bookings = append(st.bookings, b)
				st.lastAos = p.Aos
				st.lastLos = p.Los
				st.lastAz = p.AzLos
				st.lastEl = p.ElLos
				st.azUnwrap = uw
				placed = true
				break
			}

			// Check overlap
			if p.Aos.Before(st.lastLos) {
				continue
			}
			// Check slew feasibility
			if !CanFit(st.lastAz, st.lastEl, p, st.lastLos) {
				continue
			}
			// Check UL
			if p.NeedsUplink && !RequiresUplinkWindow(p, 60) {
				continue
			}
			// Wrap accumulation
			uw := UnwrapNear(st.azUnwrap, p.AzAos)
			if !WrapOK(uw) {
				continue
			}
			gap := SlewGap(st.lastAz, st.lastEl, p)
			b := Booking{
				PassID:         p.ID,
				AntennaID:      st.ant.ID,
				Aos:            p.Aos,
				Los:            p.Los,
				SlewGapSeconds: gap,
				Flags:          flags,
			}
			st.bookings = append(st.bookings, b)
			st.lastAos = p.Aos
			st.lastLos = p.Los
			st.lastAz = p.AzLos
			st.lastEl = p.ElLos
			st.azUnwrap = uw
			placed = true
			break
		}

		if !placed {
			// Determine reason: try to give specific flag
			reason := "NO_CAPACITY"
			if IsKeyhole(p) {
				reason = "KEYHOLE_RISK"
			} else if p.NeedsUplink && !RequiresUplinkWindow(p, 60) {
				reason = "UL_INSUFFICIENT"
			} else {
				// Check if slew was the blocker on all antennas
				slewBlocked := false
				for _, st := range states {
					if len(st.bookings) > 0 && !CanFit(st.lastAz, st.lastEl, p, st.lastLos) {
						slewBlocked = true
					}
				}
				if slewBlocked {
					reason = "SLEW_BLOCKED"
				}
			}
			rejected = append(rejected, Rejected{Pass: p, Reason: reason})
		}
	}

	// Collect and sort bookings by AOS for deterministic output.
	for _, st := range states {
		booked = append(booked, st.bookings...)
	}
	sort.Slice(booked, func(i, j int) bool {
		if booked[i].Aos.Equal(booked[j].Aos) {
			return booked[i].AntennaID < booked[j].AntennaID
		}
		return booked[i].Aos.Before(booked[j].Aos)
	})
	return
}

// PickVictim selects a booking to preempt for an incoming Tier 1 request.
// Lowest tier first, then latest start time within tier, respecting MaxPreemptionsWk.
func PickVictim(busy []Booking, passes map[string]Pass, contracts map[string]Contract, preemptions map[string]int) *Booking {
	var candidates []Booking
	for _, b := range busy {
		p, ok := passes[b.PassID]
		if !ok {
			continue
		}
		if p.Tier == Tier1Strategic {
			continue
		}
		c, ok := contracts[p.ContractID]
		if ok && preemptions[c.ID] >= c.MaxPreemptionsWk {
			continue
		}
		candidates = append(candidates, b)
	}
	if len(candidates) == 0 {
		return nil
	}
	sort.Slice(candidates, func(i, j int) bool {
		pi := passes[candidates[i].PassID]
		pj := passes[candidates[j].PassID]
		if pi.Tier != pj.Tier {
			return pi.Tier > pj.Tier
		}
		return pi.Aos.After(pj.Aos)
	})
	return &candidates[0]
}
