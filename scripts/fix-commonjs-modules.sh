#!/bin/bash

# Switch all services to CommonJS output (simpler and more compatible)

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
echo "Switching to CommonJS Module Output"
echo "=========================================="
echo ""

for service in "${SERVICES[@]}"; do
  echo "Updating $service/tsconfig.json..."
  
  cat > "$service/tsconfig.json" <<EOF
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../dist/$service",
    "module": "CommonJS",
    "moduleResolution": "node",
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
echo "CommonJS Configuration Complete"
echo "=========================================="
echo ""
echo "All services now configured for CommonJS output"
echo "This is simpler and more compatible with Node.js"
