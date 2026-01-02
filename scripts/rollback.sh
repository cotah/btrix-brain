#!/bin/bash

##
# BTRIX Brain Rollback Script
# Quickly rollback to a previous brain version
##

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if version is provided
if [ -z "$1" ]; then
    print_error "Usage: ./rollback.sh <version>"
    echo ""
    echo "Examples:"
    echo "  ./rollback.sh 1.0.1"
    echo "  ./rollback.sh 1.0.0"
    exit 1
fi

TARGET_VERSION="$1"

print_info "BTRIX Brain Rollback Script"
echo ""
print_warning "This will rollback the brain to version: $TARGET_VERSION"
echo ""

# Check if target version exists in database
print_info "Checking if version $TARGET_VERSION exists..."
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkVersion() {
  const brainId = \`btrix-brain:${TARGET_VERSION}\`;
  
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('brain_id')
    .eq('brain_id', brainId)
    .limit(1);
  
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  
  if (!data || data.length === 0) {
    console.error(\`Version ${TARGET_VERSION} not found in database\`);
    process.exit(1);
  }
  
  console.log(\`Version ${TARGET_VERSION} found in database\`);
}

checkVersion();
"

if [ $? -ne 0 ]; then
    print_error "Version $TARGET_VERSION not found in database"
    exit 1
fi

print_success "Version $TARGET_VERSION exists in database"
echo ""

# Confirm rollback
read -p "Are you sure you want to rollback to version $TARGET_VERSION? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_warning "Rollback cancelled"
    exit 0
fi

echo ""
print_info "Rolling back to version $TARGET_VERSION..."
echo ""

# Update .env file in backend
BACKEND_ENV_PATH="../ai-chatbot-plataform/backend/.env"

if [ -f "$BACKEND_ENV_PATH" ]; then
    # Backup current .env
    cp "$BACKEND_ENV_PATH" "${BACKEND_ENV_PATH}.backup"
    print_success "Backed up current .env to .env.backup"
    
    # Update BRAIN_VERSION
    if grep -q "^BRAIN_VERSION=" "$BACKEND_ENV_PATH"; then
        # Replace existing BRAIN_VERSION
        sed -i "s/^BRAIN_VERSION=.*/BRAIN_VERSION=$TARGET_VERSION/" "$BACKEND_ENV_PATH"
    else
        # Add BRAIN_VERSION
        echo "BRAIN_VERSION=$TARGET_VERSION" >> "$BACKEND_ENV_PATH"
    fi
    
    print_success "Updated BRAIN_VERSION to $TARGET_VERSION in .env"
else
    print_warning ".env file not found at $BACKEND_ENV_PATH"
    print_info "You will need to manually set BRAIN_VERSION=$TARGET_VERSION"
fi

echo ""
print_success "Rollback complete!"
echo ""
print_info "Next steps:"
echo "  1. Restart your backend server"
echo "  2. Verify the rollback worked:"
echo "     - Check logs for brain_id: btrix-brain:$TARGET_VERSION"
echo "     - Test a few queries to ensure correct responses"
echo ""
print_warning "To rollback the rollback, run:"
echo "  ./rollback.sh <previous_version>"
echo ""
