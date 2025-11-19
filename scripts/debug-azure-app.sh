#!/bin/bash

# Debug script for Azure App Service deployment issues
# 
# Usage:
#   ./scripts/debug-azure-app.sh <resource-group> <app-service-name>

set -e

RESOURCE_GROUP=${1:-"rg-ai-deck-builder"}
APP_SERVICE=${2:-"app-ai-deck-b-prod-484970"}

if [ -z "$RESOURCE_GROUP" ] || [ -z "$APP_SERVICE" ]; then
    echo "Usage: ./scripts/debug-azure-app.sh <resource-group> <app-service-name>"
    exit 1
fi

echo "=========================================="
echo "Azure App Service Debugging"
echo "=========================================="
echo "Resource Group: $RESOURCE_GROUP"
echo "App Service: $APP_SERVICE"
echo ""

echo "1. Checking App Service Status..."
echo "-----------------------------------"
az webapp show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query "{state:state, defaultHostName:defaultHostName, httpsOnly:httpsOnly}" \
    -o table

echo ""
echo "2. Checking Startup Command..."
echo "-----------------------------------"
STARTUP_CMD=$(az webapp config show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query appCommandLine -o tsv)
echo "Startup Command: ${STARTUP_CMD:-'(not set)'}"

echo ""
echo "3. Checking Node.js Version..."
echo "-----------------------------------"
NODE_VERSION=$(az webapp config show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query linuxFxVersion -o tsv)
echo "Node Version: $NODE_VERSION"

echo ""
echo "4. Checking Environment Variables..."
echo "-----------------------------------"
az webapp config appsettings list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query "[?contains(name, 'AZURE_') || name=='NODE_ENV' || name=='WEBSITE_NODE_DEFAULT_VERSION'].{Name:name, Value:value}" \
    -o table

echo ""
echo "5. Checking Recent Logs (last 50 lines)..."
echo "-----------------------------------"
az webapp log tail \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --only-show-errors false 2>&1 | head -50 || echo "Could not fetch logs"

echo ""
echo "6. Checking App Service Deployment History..."
echo "-----------------------------------"
az webapp deployment list-publishing-profiles \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query "[].{ProfileName:profileName, PublishUrl:publishUrl}" \
    -o table 2>/dev/null || echo "Could not fetch deployment profiles"

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. View live logs:"
echo "   az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_SERVICE"
echo ""
echo "2. View detailed logs in browser:"
echo "   https://${APP_SERVICE}.scm.azurewebsites.net/api/logs/docker"
echo ""
echo "3. Access Kudu console:"
echo "   https://${APP_SERVICE}.scm.azurewebsites.net"
echo ""
echo "4. Check file structure in Kudu Debug Console:"
echo "   https://${APP_SERVICE}.scm.azurewebsites.net/DebugConsole"
echo ""
echo "5. Restart the app service:"
echo "   az webapp restart --resource-group $RESOURCE_GROUP --name $APP_SERVICE"
echo ""
echo "6. Check if server.js exists in deployment:"
echo "   az webapp ssh --resource-group $RESOURCE_GROUP --name $APP_SERVICE"
echo "   Then run: ls -la /home/site/wwwroot/"

