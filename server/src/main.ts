#!/usr/bin/env node

import { createAppContext } from './bootstrap.js';
import { runServer } from './runServer.js';
import { runWorker } from './runWorker.js';

type Mode = 'server' | 'worker' | 'all';

function parseMode(argv: string[]): Mode {
  const arg = argv.find(a => a.startsWith('--mode='));
  const value = arg?.split('=')[1];

  if (value !== 'server' && value !== 'worker' && value !== 'all') {
    throw new Error(
      `Missing or invalid --mode argument (got: ${value ?? 'none'}). Usage: node main.js --mode=server|worker|all`,
    );
  }

  return value;
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const ctx = await createAppContext(mode);

  const stopFns: Array<() => Promise<void>> = [];
  if (mode === 'server' || mode === 'all') {
    stopFns.push(await runServer(ctx));
  }
  if (mode === 'worker' || mode === 'all') {
    stopFns.push(await runWorker(ctx));
  }

  const shutdown = async (): Promise<void> => {
    ctx.logger.info('Shutting down...');
    await Promise.all(stopFns.map(stop => stop()));
    ctx.config.stop();
    await ctx.database.close();
    ctx.logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', error);
  process.exit(1);
});
