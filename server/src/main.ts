#!/usr/bin/env node

import { createAppContext } from './bootstrap.js';
import { runServer } from './runServer.js';
import { runWorker } from './runWorker.js';

type Mode = 'server' | 'worker';

function parseMode(argv: string[]): Mode {
  const arg = argv.find(a => a.startsWith('--mode='));
  const value = arg?.split('=')[1];

  if (value !== 'server' && value !== 'worker') {
    throw new Error(
      `Missing or invalid --mode argument (got: ${value ?? 'none'}). Usage: node main.js --mode=server|worker`,
    );
  }

  return value;
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const ctx = await createAppContext(mode);

  if (mode === 'server') {
    await runServer(ctx);
  } else {
    await runWorker(ctx);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', error);
  process.exit(1);
});
