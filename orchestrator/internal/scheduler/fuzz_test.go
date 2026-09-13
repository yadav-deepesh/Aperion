package scheduler

import "testing"

func FuzzSlewTime(f *testing.F) {
	f.Add(0.0, 20.0, 10.0)
	f.Add(180.0, 20.0, 10.0)
	f.Fuzz(func(t *testing.T, delta, vmax, amax float64) {
		if delta < 0 || vmax <= 0 || amax <= 0 {
			t.Skip()
		}
		got := SlewTime(delta, AxisKinematics{Vmax: vmax, Amax: amax, Settle: 1.0})
		if got < 0 {
			t.Fatalf("negative slew %v", got)
		}
		bigger := SlewTime(delta*1.5+1, AxisKinematics{Vmax: vmax, Amax: amax, Settle: 1.0})
		if bigger < got {
			t.Fatalf("non-monotone %v then %v", got, bigger)
		}
	})
}

func FuzzAzDelta(f *testing.F) {
	f.Add(10.0, 350.0)
	f.Add(-370.0, 370.0)
	f.Fuzz(func(t *testing.T, a, b float64) {
		d := AzDelta(a, b)
		if d < 0 || d > AzLimit+1e-9 {
			t.Fatalf("az delta out of range %v", d)
		}
	})
}
