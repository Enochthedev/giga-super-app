#!/bin/bash

# Fix TypeScript type issues across all services
# Adds proper type declarations for extended Express Request

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
echo "Fixing TypeScript Types for All Services"
echo "=========================================="
echo ""

# Function to add Express Request extension to modules.d.ts
fix_service_types() {
  local service=$1
  local types_file="${service}/src/types/modules.d.ts"
  
  echo "Fixing $service..."
  
  # Create types directory if it doesn't exist
  mkdir -p "${service}/src/types"
  
  # Check if modules.d.ts exists
  if [ ! -f "$types_file" ]; then
    echo "Creating $types_file..."
    cat > "$types_file" <<'EOF'
// Extend Express Request type
declare namespace Express {
  export interface Request {
    requestId?: string;
    user?: {
      id: string;
      email: string;
      role?: string;
      roles?: string[];
    };
  }
}
EOF
  else
    # Check if Express namespace already exists
    if ! grep -q "declare namespace Express" "$types_file"; then
      echo "Adding Express namespace to $types_file..."
      cat >> "$types_file" <<'EOF'

// Extend Express Request type
declare namespace Express {
  export interface Request {
    requestId?: string;
    user?: {
      id: string;
      email: string;
      role?: string;
      roles?: string[];
    };
  }
}
EOF
    else
      echo "Express namespace already exists in $types_file"
    fi
  fi
  
  echo "✓ Fixed $service"
}

# Fix each service
for service in "${SERVICES[@]}"; do
  if [ -d "$service" ]; then
    fix_service_types "$service"
  else
    echo "⚠ Skipping $service (directory not found)"
  fi
  echo ""
done

echo "=========================================="
echo "TypeScript Type Fixes Complete"
echo "=========================================="
echo ""
echo "All services now have proper Express Request type extensions."
echo "This fixes 'requestId' and 'user' property errors."
