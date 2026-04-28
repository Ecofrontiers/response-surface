.PHONY: build keys start stop clean

AXL_REPO := https://github.com/gensyn-ai/axl.git
AXL_DIR := .axl-build

build:
	@if [ ! -d "$(AXL_DIR)" ]; then \
		git clone $(AXL_REPO) $(AXL_DIR); \
	fi
	cd $(AXL_DIR) && go build -o ../axl ./cmd/axl
	@echo "AXL binary built at ./axl"

keys:
	./scripts/generate-keys.sh

start: keys
	./scripts/start-cluster.sh

stop:
	@pkill -f "axl.*config" || true
	@echo "AXL nodes stopped"

docker-build:
	docker compose build

docker-start:
	./scripts/generate-keys.sh
	docker compose up -d

docker-stop:
	docker compose down

clean:
	rm -rf $(AXL_DIR) axl
