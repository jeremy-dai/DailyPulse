.PHONY: dev build start lint

dev:
	@lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint
