# Paperless LLM Frontend

Simple React frontend for managing Paperless documents and monitoring LLM processing jobs.

## Features

- **Documents Page**: List documents tagged with "llm-process", select multiple documents, and trigger title generation
- **Queues Page**: Monitor both LLM and Document Update queues with real-time statistics and auto-refresh
- **Audit Log Page**: View audit trail with document filtering and pagination

## Tech Stack

- React 18 with TypeScript
- Material-UI for UI components
- Vite for fast development and optimized builds
- Axios for API communication
- React Router for navigation

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Backend API running on http://localhost:3000 (configurable)

### Installation

```bash
npm install
```

### Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` to set your API base URL:

```
VITE_API_BASE_URL=http://localhost:3000
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
src/
├── types/          # TypeScript type definitions
│   └── api.ts      # API response types
├── services/       # API client services
│   └── api.ts      # Axios-based API client
├── components/     # Reusable UI components
│   ├── DocumentList.tsx
│   ├── QueueStatsCard.tsx
│   ├── QueueItemsTable.tsx
│   └── AuditLogTable.tsx
├── pages/          # Page components
│   ├── DocumentsPage.tsx
│   ├── QueuesPage.tsx
│   └── AuditLogPage.tsx
├── App.tsx         # App shell with routing and navigation
└── main.tsx        # Entry point
```

## Usage

### Documents Page

1. Documents tagged with "llm-process" are automatically loaded
2. Select one or more documents using checkboxes
3. Click "Generate Title" button to submit jobs
4. Successfully submitted jobs will appear in the queue

### Queues Page

- **LLM Queue Tab**: Monitor LLM processing jobs (title, tag, summary generation)
- **Document Update Queue Tab**: Monitor document update actions
- Statistics auto-refresh every 5 seconds
- Filter items by status (Pending, Processing, Completed, Failed)
- Load more items with cursor-based pagination

### Audit Log Page

- View all audit entries with timestamps
- Filter by document ID
- Pagination support (offset-based)

## API Integration

The frontend communicates with the backend API at `/api/*`:

- `GET /api/documents?tag=llm-process` - List documents
- `POST /api/jobs` - Submit title generation jobs
- `GET /api/queue/llm/stats` - LLM queue statistics
- `GET /api/queue/llm/items` - LLM queue items
- `GET /api/queue/document-update/stats` - Document update queue statistics
- `GET /api/queue/document-update/items` - Document update queue items
- `GET /api/audit` - Audit log entries

## Development Notes

- The application uses Material-UI's default light theme
- Error boundary catches React errors and displays error page
- All API calls include error handling with user-friendly messages
- CORS is configured in the backend to allow frontend origin
- Vite proxy is configured to forward `/api` requests to backend in development

## License

See root project LICENSE
