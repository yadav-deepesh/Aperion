## What

<!-- One paragraph: what this PR changes and why -->

## Property / Fuzz evidence

- [ ] New property test: `____` (fails without this change: yes / no)
- [ ] Fuzz target touched: `____` (30s smoke clean: yes / no)
- [ ] TLA+ spec updated (if lifecycle / preemption changed)

## Citations

- [ ] Every new constant has a source comment (NRSC spec, ITU-R P.618-14, ETSI EN 302 307, IMD rain rate, DoT Roadmap, NTIA TM-18-531)

## Discipline

- [ ] No `unwrap()` / `panic!` / `expect()` in Rust engine request paths (return `Result`)
- [ ] No discarded `err` in Go (`_ = f()` banned; wrap with `%w`)
- [ ] No `any` in TypeScript; no non-null `!` assertions outside tests
- [ ] `make dev` boots all 5 services from a clean clone (`docker compose up` green)

## Checks

- [ ] `golangci-lint` / `cargo clippy` / `ruff` / `eslint` clean
- [ ] `go test -race` / `cargo test` / `pytest` / `vitest` green (or N/A with reason)
