import { Request, Response } from 'express';

export class DocsController {
  async getDocs(req: Request, res: Response) {
    // TODO: Serve OpenAPI docs HTML
    res.type('html').send('OpenAPI Docs');
  }
  async getOpenApiYaml(req: Request, res: Response) {
    // TODO: Serve openapi.yaml
    res.type('yaml').send('openapi: 3.0.0');
  }
}
