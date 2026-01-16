#!/bin/bash

# Link each service folder to its Railway service
# Run this from the project root

PROJECT="Giga"

echo "=== Linking Railway Services ==="
echo ""
echo "This will link each service folder to its Railway service."
echo "You'll need to select the correct service for each folder."
echo ""

services=(
  "api-gateway"
  "social-service"
  "admin-service"
  "delivery-service"
  "search-service"
  "taxi-realtime-service"
  "notifications-service"
  "payment-queue-service"
)

for service in "${services[@]}"; do
  if [ -d "$service" ]; then
    echo "----------------------------------------"
    echo "Linking $service..."
    echo "----------------------------------------"
    cd "$service"
    railway link -p "$PROJECT" -s "$service"
    cd ..
    echo ""
  else
    echo "⚠️  Directory $service not found, skipping..."
  fi
done

echo "=== Done! ==="
echo ""
echo "Now you can run 'railway variables' in each service folder to see/set env vars."
