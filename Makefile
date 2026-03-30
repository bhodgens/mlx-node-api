.PHONY: help install build dev start run clean test typecheck

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE  := \033[0;34m
GREEN := \033[0;32m
WHITE := \033[0;37m
RESET := \033[0m

help: ## Show this help message
	@echo '$(BLUE)MLX-Node API$(RESET)'
	@echo ''
	@echo '$(WHITE)Available targets:$(RESET)'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo '$(BLUE)Installing dependencies...$(RESET)'
	@npm install

build: ## Build TypeScript to dist/
	@echo '$(BLUE)Building TypeScript...$(RESET)'
	@npm run build

dev: ## Run in development mode with hot reload
	@echo '$(BLUE)Starting development server...$(RESET)'
	@npm run dev

start: ## Run production server
	@echo '$(BLUE)Starting production server...$(RESET)'
	@npm run start

run: start ## Alias for start

clean: ## Remove dist/ and build artifacts
	@echo '$(BLUE)Cleaning build artifacts...$(RESET)'
	@rm -rf dist/
	@echo '$(GREEN)Done!$(RESET)'

typecheck: ## Run TypeScript type checking
	@echo '$(BLUE)Running type check...$(RESET)'
	@npm run typecheck

test: ## Run tests
	@echo '$(BLUE)Running tests...$(RESET)'
	@npm test
