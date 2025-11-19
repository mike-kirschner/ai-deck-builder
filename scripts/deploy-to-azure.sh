#!/bin/bash

# Script to build and deploy the Next.js application to Azure App Service
#
# Usage:
#   ./scripts/deploy-to-azure.sh <resource-group> <app-service-name>
#   Example: ./scripts/deploy-to-azure.sh rg-ai-deck-builder app-ai-deck-b-prod-484970

set -e  # Exit on error, but we'll handle some errors gracefully

RESOURCE_GROUP=${1:-""}
APP_SERVICE=${2:-""}

if [ -z "$RESOURCE_GROUP" ] || [ -z "$APP_SERVICE" ]; then
    echo "Usage: ./scripts/deploy-to-azure.sh <resource-group> <app-service-name>"
    exit 1
fi

echo "Building Next.js application..."
npm run build

echo "Creating deployment package..."
# Create a temporary directory for deployment
DEPLOY_DIR=".azure-deploy"
rm -rf "${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}"

# Copy necessary files for Next.js standalone deployment
if [ -d ".next/standalone" ]; then
    # Standalone mode - copy standalone directory
    echo "Using standalone build mode..."
    cp -r .next/standalone/* "${DEPLOY_DIR}/"
    
    # Copy static files to the .next directory (standalone already has .next, but needs static)
    # The static folder is not included in standalone and must be copied separately
    if [ -d ".next/static" ]; then
        echo "Copying static files..."
        # Ensure .next directory exists (it should from standalone copy, but be safe)
        mkdir -p "${DEPLOY_DIR}/.next"
        # Copy static files
        cp -r .next/static "${DEPLOY_DIR}/.next/" || {
            echo "Warning: Failed to copy static files, continuing anyway..."
        }
    fi
    
    # Copy public directory if it exists (standalone might not include it)
    if [ -d "public" ] && [ ! -d "${DEPLOY_DIR}/public" ]; then
        echo "Copying public directory..."
        cp -r public "${DEPLOY_DIR}/public" || {
            echo "Warning: Failed to copy public directory, continuing anyway..."
        }
    fi
else
    # Standard mode - copy all necessary files
    echo "Using standard build mode..."
    cp -r .next "${DEPLOY_DIR}/"
    if [ -d "public" ]; then
        cp -r public "${DEPLOY_DIR}/"
    fi
    cp package*.json "${DEPLOY_DIR}/"
    if [ -f "next.config.js" ]; then
        cp next.config.js "${DEPLOY_DIR}/"
    fi
    if [ -d "node_modules" ]; then
        cp -r node_modules "${DEPLOY_DIR}/"
    fi
fi

# Create zip file
ZIP_FILE="deploy-$(date +%s).zip"
cd "${DEPLOY_DIR}"
zip -r "../${ZIP_FILE}" . > /dev/null
cd ..

echo "Deploying to Azure App Service..."
az webapp deploy \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${APP_SERVICE}" \
    --src-path "${ZIP_FILE}" \
    --type zip

echo "Cleaning up..."
rm -rf "${DEPLOY_DIR}"
rm -f "${ZIP_FILE}"

echo "✓ Deployment complete!"
echo "Your app should be available at: https://${APP_SERVICE}.azurewebsites.net"

