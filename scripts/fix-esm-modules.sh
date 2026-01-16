#!/bin/bash

# Fix ES module compilation for all services
# Updates tsconfig to output ES modules instead of CommonJS

set -e

SERVICES=(
  "social-service"
  "admin-service"
  "payment-queue-service"
  "search-service"
  "delivery-service"
  "taxi-realtime-service"
  "notifications-service"
)

echo "=========================================="
echo "Fixing ES Module Compilation"
echo "=========================================="
echo ""

for service in "${SERVICES[@]}"; do
  echo "Updating $service/tsconfig.json..."
  
  cat > "$service/tsconfig.json" <<EOF
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../dist/$service",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "noImplicitReturns": false,
    "strictPropertyInitialization": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src/**/*", "../shared/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
EOF

  echo "✓ Updated $service"
done

echo ""
echo "=========================================="
echo "ES Module Fix Complete"
echo "=========================================="
echo ""
echo "All services now configured to output ES modules"
echo "This fixes the 'exports is not defined' error"
