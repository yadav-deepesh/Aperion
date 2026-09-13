/**
 * @fileoverview JSDoc mirrors of the frozen API shapes.
 * These are documentation-only; they land in the freeze PR and must
 * stay in sync with orchestrator/internal/db/models.go,
 * orchestrator/internal/api/handlers.go and engine/src/compute_budget.rs.
 *
 * No runtime code — only typedefs for IDE / tsc --checkJs.
 */

/**
 * @typedef {1|2|3} Tier
 * T1 strategic (ISRO/NSIL, never preempted, red-border in Gantt),
 * T2 commercial (green solid), T3 opportunistic (dashed).
 */

/**
 * Visibility window produced by skyfield_svc / orbit.py.
 * Mirrors DB `passes` row.
 * @typedef {Object} Pass
 * @property {string} id
 * @property {number} norad_id
 * @property {string} sat_name
 * @property {string} aos - RFC3339 UTC
 * @property {string} los - RFC3339 UTC
 * @property {number} max_el
 * @property {number} az_aos
 * @property {number} az_los
 * @property {number} el_aos
 * @property {number} el_los
 * @property {number} slant_km
 * @property {Tier} tier
 * @property {string} contract_id
 * @property {boolean} needs_uplink
 * @property {string=} dl_from
 * @property {string=} dl_to
 * @property {string=} ul_from
 * @property {string=} ul_to
 * @property {string[]} flags - e.g. KEYHOLE_RISK, SLEW_GAP, OVERLAP, CABLE_WRAP
 */

/**
 * @typedef {Object} BookingRow
 * @property {number} id
 * @property {string} pass_id
 * @property {number} antenna_id - 1-indexed, maps to Shadnagar-1 / Shadnagar-2
 * @property {string} aos
 * @property {string} los
 * @property {number} slew_gap_seconds
 * @property {string|null} preempted_by
 * @property {number|null} mbps
 * @property {string|null} modcod
 * @property {number|null} margin_db
 * @property {string[]} flags
 */

/**
 * Enriched schedule entry returned by GET /schedule (bookings joined with passes).
 * Until the join lands, frontend synthesises this by fetching /passes + /schedule.
 * @typedef {BookingRow & { pass: Pass }} ScheduleEntry
 */

/**
 * @typedef {Object} LedgerRow
 * mirrors db.LedgerRow / GET /ledger
 * @property {string} contract_id
 * @property {string} week_start - Monday 00:00 UTC, YYYY-MM-DD or RFC3339
 * @property {number} passes_booked
 * @property {number} passes_completed
 * @property {number} passes_missed
 * @property {number} passes_preempted
 * @property {number} preemption_count
 * @property {number} credits_owed
 * @property {number} revenue
 */

/**
 * Contract row from GET /contracts (not yet exposed, seeded via DB).
 * @typedef {Object} ContractRow
 * @property {string} id
 * @property {string} customer
 * @property {Tier} tier
 * @property {number} min_passes_per_week
 * @property {number} max_preemptions_wk
 * @property {number} credit_per_miss
 * @property {number} rate_per_pass
 */

/**
 * Antenna config seeded in orchestrator/cmd/server/main.go.
 * @typedef {Object} AntennaRow
 * @property {number} id
 * @property {string} name
 * @property {string[]} bands - e.g. ["S","X"] or ["X","Ka"]
 * @property {number} az_vmax - deg/s
 * @property {number} az_amax - deg/s^2
 * @property {number} el_vmax
 * @property {number} el_amax
 * @property {number} settle - s
 * @property {number} az_limit - deg (±)
 */

/**
 * Link-budget waterfall returned by Rust engine via Go proxy.
 * Mirrors engine/src/compute_budget.rs ComputeBudgetResult.
 * @typedef {Object} BudgetResponse
 * @property {number} fspl_db
 * @property {number} rain_db
 * @property {number} gas_db
 * @property {number} cloud_db
 * @property {number} scintillation_db
 * @property {number} pointing_db
 * @property {number} polarization_db
 * @property {number} total_loss_db
 * @property {number} received_power_dbm
 * @property {number} noise_density_dbm_hz
 * @property {number} cn0_db_hz
 * @property {number} effective_cn0_db_hz
 * @property {string|null} modcod_name
 * @property {number|null} spectral_efficiency
 * @property {number} data_rate_mbps
 * @property {number=} margin_db - alias for UI
 */

/**
 * Request shape for POST /linkbudget (Go proxy -> Rust engine).
 * Field names match engine/proto/engine.proto ComputeBudget.
 * @typedef {Object} BudgetRequest
 * @property {number} pointing_error_deg
 * @property {number} beamwidth_3db_deg
 * @property {number} transmit_power_dbm
 * @property {number} tx_gain_dbi
 * @property {number} rx_gain_dbi
 * @property {number} interference_to_noise_db
 * @property {number} system_temperature_k
 * @property {number} distance_km
 * @property {number} latitude_deg
 * @property {number} longitude_deg
 * @property {number} frequency_ghz
 * @property {number} elevation_deg
 * @property {number} station_height_km
 * @property {number} time_percent
 * @property {number} rain_rate_r001_mmh
 * @property {number} rain_polarization_deg
 * @property {number} polarization_mismatch_deg
 * @property {number} antenna_diameter_m
 * @property {number} symbol_rate_sps
 * @property {number} bandwidth_hz
 */

/**
 * WS /live event envelope.
 * @typedef {Object} LiveEvent
 * @property {string} type - booking.created | booking.preempted | ledger.updated | linkbudget.updated
 * @property {*} payload
 */

export {};
