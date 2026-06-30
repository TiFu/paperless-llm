import { createServer } from 'node:http';

// Minimal stand-in for Ollama, just enough to satisfy server/src/services/OllamaService.ts:
// - GET /            -> health check (OllamaService.checkHealth)
// - POST /api/generate -> chat completion (OllamaService.sendChatRequest)
//
// Always returns the same deterministic tag list so the e2e suite has a stable
// value to assert against, regardless of what prompt was actually rendered.
const RESPONSE_TAGS = ['e2e-generated-tag'];
const PORT = process.env.PORT ? Number(process.env.PORT) : 80;

// Deterministic failure hook for failure-path tests: the LLM_GENERATE_TAGS prompt
// template interpolates {{documentTitle}}, so a test can force every LLM call for
// a given document to fail just by putting this marker in the document's title —
// no separate control channel or stub state needed.
const FAILURE_TRIGGER = 'FORCE_LLM_FAILURE';

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      let model = 'stub-model';
      let prompt = '';
      try {
        const parsed = JSON.parse(body);
        if (parsed.model) model = parsed.model;
        if (parsed.prompt) prompt = parsed.prompt;
      } catch {
        // ignore malformed/empty body, fall back to default model name
      }

      if (prompt.includes(FAILURE_TRIGGER)) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'stub-llm: forced failure' }));
        return;
      }

      const payload = {
        model,
        created_at: new Date().toISOString(),
        response: JSON.stringify(RESPONSE_TAGS),
        done: true,
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`stub-llm listening on :${PORT}`);
});
