import pino from 'pino';
import { Request, Response } from 'express';
import { errorHandler, ApiError } from '../../../../src/api/middleware/errorHandler.js';

interface FakeResponse {
  statusCode: number;
  body: unknown;
  status(code: number): FakeResponse;
  json(payload: unknown): FakeResponse;
}

// Minimal fake req/res — no Express app/supertest needed since errorHandler
// is a plain (err, req, res, next) middleware function.
function fakeReqRes() {
  const req = { path: '/api/jobs', method: 'GET', body: {} } as Request;
  const res: FakeResponse = {
    statusCode: 0,
    body: undefined,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: unknown) { res.body = payload; return res; },
  };
  return { req, res: res as unknown as Response & FakeResponse };
}

function capturingLogger() {
  const calls: Array<{ level: string; payload: unknown; msg: string }> = [];
  const logger = {
    warn: (payload: unknown, msg: string) => calls.push({ level: 'warn', payload, msg }),
    error: (payload: unknown, msg: string) => calls.push({ level: 'error', payload, msg }),
  } as unknown as pino.Logger;
  return { logger, calls };
}

describe('errorHandler', () => {
  it('logs a 4xx ApiError at warn, not error', () => {
    const { logger, calls } = capturingLogger();
    const { req, res } = fakeReqRes();
    const err = new ApiError(400, 'Bad Request', 'missing field');

    errorHandler(logger)(err, req, res, () => {});

    expect(calls).toHaveLength(1);
    expect(calls[0].level).toBe('warn');
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ status: 400, title: 'Bad Request' });
  });

  it('logs an unrecognized/5xx error at error, not warn', () => {
    const { logger, calls } = capturingLogger();
    const { req, res } = fakeReqRes();
    const err = new Error('boom');

    errorHandler(logger)(err, req, res, () => {});

    expect(calls).toHaveLength(1);
    expect(calls[0].level).toBe('error');
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ status: 500, title: 'Internal Server Error' });
  });

  it('logs an express-validator ValidationError (400) at warn', () => {
    const { logger, calls } = capturingLogger();
    const { req, res } = fakeReqRes();
    const err = new Error('invalid input');
    err.name = 'ValidationError';

    errorHandler(logger)(err, req, res, () => {});

    expect(calls[0].level).toBe('warn');
    expect(res.statusCode).toBe(400);
  });

  it('logs an express-openapi-validator HttpError (4xx, non-ApiError) at warn', () => {
    const { logger, calls } = capturingLogger();
    const { req, res } = fakeReqRes();
    const err = Object.assign(new Error('field out of range'), { status: 422 });

    errorHandler(logger)(err, req, res, () => {});

    expect(calls[0].level).toBe('warn');
    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({ status: 422, title: 'Bad Request' });
  });

  it('does not log a response function reference (regression check for the old res.json bug)', () => {
    const { logger, calls } = capturingLogger();
    const { req, res } = fakeReqRes();

    errorHandler(logger)(new Error('boom'), req, res, () => {});

    expect(calls[0].payload).not.toHaveProperty('response');
  });
});
