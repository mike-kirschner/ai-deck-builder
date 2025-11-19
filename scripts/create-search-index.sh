#!/bin/bash

# Script to create Azure AI Search index for knowledge base
# 
# Usage:
#   ./scripts/create-search-index.sh <resource-group> <search-service-name>

set -e

RESOURCE_GROUP=${1:-""}
SEARCH_SERVICE=${2:-""}

if [ -z "$RESOURCE_GROUP" ] || [ -z "$SEARCH_SERVICE" ]; then
    echo "Usage: ./scripts/create-search-index.sh <resource-group> <search-service-name>"
    exit 1
fi

# Get admin key
ADMIN_KEY=$(az search admin-key show \
    --resource-group "${RESOURCE_GROUP}" \
    --service-name "${SEARCH_SERVICE}" \
    --query primaryKey -o tsv)

ENDPOINT="https://${SEARCH_SERVICE}.search.windows.net"
INDEX_NAME="knowledge-base"

# Create index definition
INDEX_DEFINITION=$(cat <<EOF
{
  "name": "${INDEX_NAME}",
  "fields": [
    {
      "name": "id",
      "type": "Edm.String",
      "key": true,
      "searchable": false,
      "filterable": true,
      "sortable": true,
      "facetable": false
    },
    {
      "name": "title",
      "type": "Edm.String",
      "searchable": true,
      "filterable": true,
      "sortable": true,
      "facetable": false,
      "analyzer": "en.microsoft"
    },
    {
      "name": "content",
      "type": "Edm.String",
      "searchable": true,
      "filterable": false,
      "sortable": false,
      "facetable": false,
      "analyzer": "en.microsoft"
    },
    {
      "name": "type",
      "type": "Edm.String",
      "searchable": false,
      "filterable": true,
      "sortable": true,
      "facetable": true
    },
    {
      "name": "tags",
      "type": "Collection(Edm.String)",
      "searchable": false,
      "filterable": true,
      "sortable": false,
      "facetable": true
    },
    {
      "name": "created_at",
      "type": "Edm.DateTimeOffset",
      "searchable": false,
      "filterable": true,
      "sortable": true,
      "facetable": false
    },
    {
      "name": "created_by",
      "type": "Edm.String",
      "searchable": false,
      "filterable": true,
      "sortable": true,
      "facetable": true
    }
  ],
  "suggesters": [
    {
      "name": "sg",
      "searchMode": "analyzingInfixMatching",
      "sourceFields": ["title"]
    }
  ]
}
EOF
)

# Create index using REST API
echo "Creating Azure AI Search index '${INDEX_NAME}'..."
curl -X PUT "${ENDPOINT}/indexes/${INDEX_NAME}?api-version=2023-11-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${ADMIN_KEY}" \
  -d "${INDEX_DEFINITION}"

echo ""
echo "✓ Index '${INDEX_NAME}' created successfully!"

