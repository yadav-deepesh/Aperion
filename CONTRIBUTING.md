# Contributing to Aperion

## Branch workflow — everyone works on their own feature branch

**Never push to `main` directly.** Branch protection will block you — that's intentional.

### One feature, one branch

```bash
# Start from latest main
git checkout main
git pull origin main

# Create your branch
git checkout -b feat/<area>-<short-desc>

# Examples per member
# Deepesh:  feat/orchestrator-slew-check
# Abhishek: feat/engine-link-budget
# Ansh:     feat/frontend-gantt
# Sarthak:  feat/skyfield-validation
# Poorab:   feat/rain-service
# Priyanka: feat/deploy-healthchecks
```

### Commit

Use Conventional Commits with a scope:

```
feat(orchestrator): trapezoidal slew check in CanFit
fix(engine): clamp Es/N0 before MODCOD lookup
test(frontend): Gantt renders slew gaps
docs: update site coords citation
```

Scopes: `orchestrator`, `engine`, `frontend`, `skyfield-svc`, `rain-svc`, `deploy`, `spec`, `docs`

### Push and open a PR

```bash
git push -u origin feat/<area>-<short-desc>
```

Open a PR on GitHub. Template will ask for:

- What the PR changes and why
- Property / fuzz evidence (which test would fail without it)
- Citations for every new constant

### Merge rules

- Needs **1 approval** and **Code Owner review** (CODEOWNERS auto-assigns: orchestrator/spec -> yadav-deepesh, engine -> Byteme-dot, frontend -> Tribalchief39, skyfield -> SarthakGupta24csu185, rain -> poorab2309, deploy/export-> techieydv).
- CI must be green (lint + tests). When CI exists, it will auto-block red PRs.
- Squash and merge — keeps `main` linear and readable.
- Delete the branch after merge.

### Housekeeping

- Branches live < 1 day. Don't hoard them.
- Never force-push to `main`. Feature branches only.
- If you need help, open a draft PR early with `[WIP]` in the title.
