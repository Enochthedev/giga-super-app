#!/bin/bash

# Fix path aliases by adding baseUrl and paths to tsconfig files
# This allows TypeScript to resolve @/ imports

set -e

SERVICES=(
  "payment-queue-service"
  "delivery-service"
)

echo "=========================================="
echo "Fixing Path Aliases in Services"
echo "=========================================="
echo ""

for service in "${SERVICES[@]}"; do
  echo "Updating $service/tsconfig.json with path aliases..."
  
  cat > "$service/tsconfig.json" <<EOF
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../dist/$service",
    "module": "CommonJS",
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    },
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
echo "Path Alias Configuration Complete"
echo "=========================================="
