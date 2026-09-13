# Aperion demo workflow. Requires Docker + compose v2.
COMPOSE = docker compose -f deploy/docker-compose.yml

.PHONY: dev down health logs ps build

dev: ## Boot the full stack (Postgres + 4 services) and wait for health.
	$(COMPOSE) up -d --build
	bash scripts/health_all.sh

down: ## Stop everything (keeps the pgdata volume).
	$(COMPOSE) down

health: ## Probe every /health endpoint + the dashboard shell.
	bash scripts/health_all.sh

logs: ## Tail all service logs.
	$(COMPOSE) logs -f

ps: ## Container + health status.
	$(COMPOSE) ps

build: ## Build all images without starting anything.
	$(COMPOSE) build
	docker build -f deploy/Dockerfile.engine .
