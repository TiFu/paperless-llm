#!/bin/bash
# Submit a job to process a document with the paperless-llm API

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
DOCUMENT_ID="${1:-1}"
JOB_TYPES="${2:-title}"

echo "📤 Submitting job..."
echo "  Document ID: $DOCUMENT_ID"
echo "  Job Type(s): $JOB_TYPES"
echo ""

# Convert comma-separated job types to JSON array
IFS=',' read -ra JOB_ARRAY <<< "$JOB_TYPES"
JOB_JSON=$(printf '"%s",' "${JOB_ARRAY[@]}" | sed 's/,$//')

# Submit the job
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"documents\": [
      {
        \"documentId\": \"$DOCUMENT_ID\",
        \"jobTypes\": [$JOB_JSON]
      }
    ]
  }")

# Extract HTTP code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Display result
if [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Job submitted successfully!"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Failed to submit job (HTTP $HTTP_CODE)"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
