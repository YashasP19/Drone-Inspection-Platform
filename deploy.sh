#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Deploying Drone Infrastructure Inspector"
echo "=========================================================="

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker and Docker Compose first."
    exit 1
fi

# Check Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Error: Docker daemon is not running. Please start Docker."
    exit 1
fi

# Ensure .env file exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "⚠ No .env file found. Copying .env.example to .env..."
        cp .env.example .env
        echo "👉 Please edit .env with your GROQ_API_KEY and GEMINI_API_KEY before running in production."
    fi
fi

echo "📦 Building and starting containers with Docker Compose..."
docker compose up -d --build

echo ""
echo "=========================================================="
echo "✔ Deployment complete!"
echo "Website is live at: http://localhost:${HOST_PORT:-80}"
echo "Container status:"
docker compose ps
echo "=========================================================="
echo "To view live logs: docker compose logs -f"
echo "To stop:           docker compose down"
