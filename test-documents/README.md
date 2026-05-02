# Test Documents

This directory is used for testing the Paperless-ngx integration in the development environment.

## Structure

- **consume/** - Place test documents here. Paperless will automatically import them.
  - PDFs
  - Images (PNG, JPG, TIFF)
  - Office documents (DOCX, XLSX, etc.)

## Usage

### Adding Test Documents

1. Copy or create test documents in the `consume/` folder:
   ```bash
   cp ~/Downloads/test-invoice.pdf test-documents/consume/
   ```

2. Paperless will automatically detect and process the files within ~60 seconds (configurable via `PAPERLESS_CONSUMER_POLLING`)

3. Monitor the processing:
   ```bash
   docker logs -f paperless-ngx-dev
   ```

### Accessing Paperless-ngx

- **Web UI**: http://localhost:8000
- **Default credentials**:
  - Username: `admin`
  - Password: `admin`

### Creating an API Token

1. Log in to Paperless at http://localhost:8000
2. Go to Settings → API Tokens
3. Create a new token
4. Copy the token to your `.env` file or config.yaml:
   ```yaml
   paperless:
     url: http://localhost:8000
     token: your-token-here
   ```

### Organizing Documents

The consume folder supports subdirectories as tags:
```
consume/
├── invoices/
│   └── invoice-001.pdf  # Will be tagged "invoices"
├── receipts/
│   └── receipt-001.pdf  # Will be tagged "receipts"
└── contracts/
    └── contract-001.pdf # Will be tagged "contracts"
```

This feature is enabled via `PAPERLESS_CONSUMER_SUBDIRS_AS_TAGS=true` in the docker-compose.dev.yml.

## PostgreSQL Database

Paperless uses the same PostgreSQL instance as paperless-llm but with a separate database called `paperless`. The connection details are:

- Host: localhost
- Port: 5432
- Database: paperless
- User: paperless
- Password: paperless (default, configurable via `PAPERLESS_DB_PASSWORD`)

## Sample Test Documents

You can generate test documents for development:

### Create a sample PDF
```bash
# Using LibreOffice (if installed)
echo "Test Invoice\nAmount: $100\nDate: 2026-05-02" > test-documents/consume/test-invoice.txt
libreoffice --headless --convert-to pdf --outdir test-documents/consume test-documents/consume/test-invoice.txt
rm test-documents/consume/test-invoice.txt

# Or use any PDF you have
cp ~/Documents/*.pdf test-documents/consume/
```

### Create test text files (will be converted)
```bash
cat > test-documents/consume/sample-document.txt << 'EOF'
Sample Document
Date: May 2, 2026

This is a sample document for testing the Paperless-ngx integration
with the paperless-llm application.

Content includes various information that can be processed by LLM
for title generation, summarization, or other enhancement tasks.
EOF
```

## Troubleshooting

### Documents not being consumed

1. Check Paperless logs:
   ```bash
   docker logs paperless-ngx-dev
   ```

2. Verify the consume folder is mounted:
   ```bash
   docker exec paperless-ngx-dev ls -la /usr/src/paperless/consume
   ```

3. Check file permissions (should be readable by UID 1000):
   ```bash
   ls -la test-documents/consume/
   ```

### Cannot access Paperless UI

1. Check if the container is running:
   ```bash
   docker ps | grep paperless
   ```

2. Check the health status:
   ```bash
   docker inspect paperless-ngx-dev | grep -A 10 Health
   ```

3. View logs for errors:
   ```bash
   docker logs paperless-ngx-dev
   ```
