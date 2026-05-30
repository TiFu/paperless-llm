import express, { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const redoc = require('redoc-express');

export function createDocsRouter(): Router {
  const router = Router();

  // Serve the OpenAPI YAML spec file
  router.get('/openapi.yaml', (_req: Request, res: Response) => {
    const specPath = path.resolve(__dirname, '../../../docs/openapi.yaml');
    if (fs.existsSync(specPath)) {
      res.setHeader('Content-Type', 'application/x-yaml');
      res.sendFile(specPath);
    } else {
      res.status(404).json({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'OpenAPI specification file not found',
      });
    }
  });

  // Serve ReDoc interactive documentation UI
  router.get(
    '/',
    redoc({
      title: 'Paperless-LLM API Documentation',
      specUrl: '/api/docs/openapi.yaml',
      redocOptions: {
        theme: {
          colors: {
            primary: {
              main: '#3b82f6',
            },
          },
          typography: {
            fontSize: '14px',
            fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
          },
        },
        hideDownloadButton: false,
        disableSearch: false,
        scrollYOffset: 0,
      },
    })
  );

  // Serve static docs (for ReDoc assets and openapi.yaml)
  router.use('/', (req, res, next) => {
    express.static(path.resolve(__dirname, '../../../docs/'))(req, res, next);
  });

  return router;
}
