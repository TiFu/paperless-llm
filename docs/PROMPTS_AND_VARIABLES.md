# Prompts & Variables Quick Reference

This guide provides a quick reference for working with prompts and variables in the Paperless-LLM system.

## Overview

The prompt system uses template-based prompts with variable substitution to generate dynamic LLM requests. Prompts are stored in the database and can be customized via the API.

## Available Variables

Variables use the `{{variableName}}` syntax and are automatically replaced when the prompt is rendered.

| Variable | Type | Description | Example Value | Truncation |
|----------|------|-------------|---------------|------------|
| `{{documentContent}}` | string | Full text content of the document | "This is a bank statement from..." | Max 4000 chars |
| `{{documentTitle}}` | string | Current title of the document (or fallback) | "Invoice 2024-01-15" or "(No title)" | None |

### Coming Soon

The following variables are planned for future releases:

- `{{availableTags}}` - List of all available tags in Paperless
- `{{existingTags}}` - Tags already assigned to the document
- `{{correspondents}}` - List of all correspondents
- `{{documentType}}` - Type of the document
- Custom metadata fields

## How Prompts Work

### 1. Storage

Prompts are stored in the PostgreSQL `prompts` table:

```sql
CREATE TABLE prompts (
  id UUID PRIMARY KEY,
  step_type TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2. Retrieval

When a step needs a prompt:
1. `PromptApplicationService` fetches the prompt by `step_type`
2. Document data is gathered from Paperless
3. `PromptDomainService.renderPrompt()` replaces variables
4. Rendered prompt is sent to the LLM (Ollama)

### 3. Versioning

Each prompt update automatically increments the version number, allowing you to track changes over time.

## Default Prompts

### LLM_GENERATE_TITLE

**Step Type:** `LLM_GENERATE_TITLE`  
**Purpose:** Generate a concise document title  
**Version:** 1

```
Generate a concise and descriptive title for the following document. The title should be clear, 
informative, and suitable for document management. Respond with ONLY the title, no explanations 
or quotes.

Document content:
{{documentContent}}

Title:
```

**Variables Used:**
- `{{documentContent}}` - The document text (truncated to 4000 chars)

**Example Output:**
```
Bank Statement - Chase Checking - January 2024
```

## Creating Custom Prompts

### Via API

Use the `PUT /api/prompts/:stepType` endpoint to create or update a prompt:

```bash
curl -X PUT http://localhost:3000/api/prompts/LLM_GENERATE_TITLE \
  -H "Content-Type: application/json" \
  -d '{
    "template": "Create a short title for this document:\n\n{{documentContent}}\n\nTitle:"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "stepType": "LLM_GENERATE_TITLE",
  "template": "Create a short title for this document:\n\n{{documentContent}}\n\nTitle:",
  "version": 2,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T12:30:00Z"
}
```

### Via Frontend

*(Coming soon - UI for prompt management)*

## Best Practices

### 1. Be Specific

Clear instructions lead to better results:

❌ **Bad:**
```
Title: {{documentContent}}
```

✅ **Good:**
```
Generate a concise and descriptive title for the following document. 
The title should be clear, informative, and suitable for document management. 
Respond with ONLY the title, no explanations or quotes.

Document content:
{{documentContent}}

Title:
```

### 2. Constrain Output Format

Explicitly tell the LLM what format to use:

```
Respond with ONLY the title, no explanations or quotes.
```

```
Output format: JSON array of tags, e.g., ["invoice", "taxes", "2024"]
```

### 3. Provide Context

Help the LLM understand the use case:

```
You are helping organize documents in a document management system. 
Generate tags that will help users find this document later.
```

### 4. Handle Edge Cases

Consider what happens with short or unusual documents:

```
If the document is too short or unclear, respond with a generic but 
descriptive title like "Document - [date]" or "Scanned Page".
```

### 5. Test Iteratively

- Start with a simple prompt
- Test with various document types
- Refine based on actual results
- Use version numbers to track improvements

## Variable Substitution Details

### How It Works

The `PromptDomainService.renderPrompt()` method uses regex-based substitution:

1. Finds all `{{variableName}}` patterns in the template
2. Looks up each variable in the document data
3. Replaces the pattern with the actual value
4. Returns the fully rendered prompt

### Truncation Logic

**Document Content Truncation:**
- Maximum length: 4000 characters
- Prevents token limit issues with LLM APIs
- Truncates from the end (keeps beginning of document)
- Configurable in the future

### Missing Variables

If a variable is not found:
- The placeholder remains in the template (e.g., `{{missingVar}}`)
- No error is thrown
- Check logs for warnings

## Supported Step Types

Currently, only one step type requires a prompt:

| Step Type | Description | Needs Prompt |
|-----------|-------------|--------------|
| `LLM_GENERATE_TITLE` | Generate document title | ✅ Yes |
| `REQUIRE_APPROVAL` | Manual approval gate | ❌ No |
| `UPDATE_DOCUMENT` | Apply document updates | ❌ No |

### Future Step Types

Planned step types that will need prompts:

- `LLM_GENERATE_TAGS` - Generate document tags
- `LLM_GENERATE_SUMMARY` - Generate document summary
- `LLM_DETECT_CORRESPONDENT` - Identify document sender/correspondent
- `LLM_EXTRACT_DATE` - Extract document date
- `LLM_CLASSIFY_TYPE` - Classify document type

## API Reference

### GET /api/prompts

Fetch all prompts.

**Response:**
```json
{
  "prompts": [
    {
      "id": "...",
      "stepType": "LLM_GENERATE_TITLE",
      "template": "...",
      "version": 2,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### PUT /api/prompts/:stepType

Create or update a prompt. Automatically increments version number.

**Request Body:**
```json
{
  "template": "Your prompt template with {{variables}}"
}
```

**Response:** Same as GET (single prompt object)

## Examples

### Example 1: Simple Title Generation

**Prompt:**
```
Generate a title for this document:

{{documentContent}}

Title:
```

**Input Document:**
```
Invoice from Acme Corp
Date: 2024-01-15
Amount: $1,234.56
...
```

**LLM Output:**
```
Invoice - Acme Corp - January 15, 2024
```

### Example 2: Structured Output

**Prompt:**
```
Analyze this document and provide a structured title.

Document:
{{documentContent}}

Format: [Type] - [Sender/Source] - [Date]
Example: Invoice - Acme Corp - 2024-01-15

Title:
```

**LLM Output:**
```
Invoice - Acme Corp - 2024-01-15
```

### Example 3: Conditional Logic

**Prompt:**
```
Generate a title for this document. If it's an invoice, include the vendor name and date.
If it's a receipt, include the store name. If unclear, create a descriptive generic title.

Current title (if any): {{documentTitle}}
Document content:
{{documentContent}}

Title:
```

## Troubleshooting

### Issue: Variables Not Replaced

**Symptom:** Prompt sent to LLM contains `{{documentContent}}` literally

**Solution:**
- Verify variable spelling matches exactly (case-sensitive)
- Check that document data is being fetched correctly
- Review logs for variable substitution errors

### Issue: Prompt Too Long

**Symptom:** LLM API returns token limit error

**Solution:**
- Document content is automatically truncated to 4000 chars
- Further reduce prompt length
- Remove unnecessary instructions
- Consider splitting into multiple prompts

### Issue: Inconsistent LLM Output

**Symptom:** LLM sometimes adds extra text or formatting

**Solution:**
- Add explicit format constraints: "Respond with ONLY the title"
- Provide examples of desired output format
- Adjust LLM temperature setting (lower = more consistent)
- Test with different models

## Related Documentation

- [Architecture Guide](ARCHITECTURE.md) - Understand how prompts fit into the system
- [Domain Concepts](DOMAIN_CONCEPTS.md) - Learn about Steps and Workflows
- [Configuration Guide](CONFIGURATION.md) - Configure LLM settings and timeouts
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Debug LLM and prompt issues

## Code References

Key files for the prompt system:

- `server/src/domain/prompt/Prompt.ts` - Prompt domain entity
- `server/src/domain/prompt/PromptDomainService.ts` - Variable substitution logic
- `server/src/application/PromptApplicationService.ts` - Prompt retrieval and updates
- `server/src/repositories/postgresql/PostgreSQLPromptsRepository.ts` - Database operations
- `server/migrations/002_seed-default-prompts.sql` - Default prompt definitions
