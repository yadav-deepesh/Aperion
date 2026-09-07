COMPOSE := docker compose -f deploy/docker-compose.yml
COMPOSE_BUILD := $(COMPOSE) up --build -d
COMPOSE_DOWN := $(COMPOSE) down
COMPOSE_LOGS := $(COMPOSE) logs -f

.PHONY: dev down clean logs ps health smoke goldens

dev:
	$(COMPOSE_BUILD)
	@echo "Waiting for healthchecks (30s)..."
	@sleep 5
	@bash scripts/health_all.sh || (echo "health failed — run 'make logs'"; exit 1)

down:
	$(COMPOSE_DOWN)

clean:
	$(COMPOSE) down -v --rmi local --remove-orphans

logs:
	$(COMPOSE_LOGS)

ps:
	$(COMPOSE) ps

health:
	bash scripts/health_all.sh

smoke:
	bash scripts/smoke.sh

goldens:
	@echo "Regenerate golden fixtures (only after reviewed intentional change)"
	@echo "orchestrator: go test -run TestGolden -update"
	@echo "engine: cargo test -- --update-goldens"

