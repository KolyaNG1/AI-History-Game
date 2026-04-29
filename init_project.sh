#!/bin/bash

set -e

mkdir -p docs

mkdir -p backend/app/api
mkdir -p backend/app/core
mkdir -p backend/app/models
mkdir -p backend/app/services
mkdir -p backend/app/data
mkdir -p backend/tests

mkdir -p ml/scenario_logic
mkdir -p ml/prompts
mkdir -p ml/utils

mkdir -p frontend/public
mkdir -p frontend/src/api
mkdir -p frontend/src/components
mkdir -p frontend/src/pages

mkdir -p shared

touch README.md
touch .gitignore

touch docs/architecture.md
touch docs/api-contract.md
touch docs/scenarios.md

touch backend/README.md
touch backend/requirements.txt
touch backend/run.py

touch backend/app/__init__.py
touch backend/app/main.py

touch backend/app/api/__init__.py
touch backend/app/api/routes.py

touch backend/app/core/__init__.py
touch backend/app/core/config.py

touch backend/app/models/__init__.py
touch backend/app/models/requests.py
touch backend/app/models/responses.py

touch backend/app/services/__init__.py
touch backend/app/services/game_service.py
touch backend/app/services/ml_bridge.py
touch backend/app/services/session_store.py

touch backend/app/data/__init__.py
touch backend/app/data/scenarios.py

touch backend/tests/__init__.py
touch backend/tests/test_health.py

touch ml/README.md
touch ml/requirements.txt
touch ml/__init__.py
touch ml/generator.py

touch ml/scenario_logic/__init__.py
touch ml/scenario_logic/paul_i.py
touch ml/scenario_logic/decembrists.py
touch ml/scenario_logic/february_revolution.py
touch ml/scenario_logic/civil_war.py
touch ml/scenario_logic/ussr_collapse.py

touch ml/prompts/__init__.py
touch ml/prompts/templates.py

touch ml/utils/__init__.py
touch ml/utils/history_formatter.py

touch frontend/README.md
touch frontend/package.json

touch frontend/src/main.jsx
touch frontend/src/App.jsx
touch frontend/src/api/client.js
touch frontend/src/components/ScenarioList.jsx
touch frontend/src/components/ChatWindow.jsx
touch frontend/src/components/MessageInput.jsx
touch frontend/src/pages/HomePage.jsx

touch shared/README.md
touch shared/api_examples.json

touch run_backend.py

echo "Project structure created in current directory"