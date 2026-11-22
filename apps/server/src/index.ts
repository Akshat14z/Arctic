import { buildApp } from './app.js';
import { getConfig } from './config.js';
import { ensureDemoSeeded } from './services/demo.service.js';

async function main() {
  const config = getConfig();
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    console.log(`🚀 ConvoCart Platform Server listening at ${address}`);
    // Warm start: do the one-time demo seed now, in the background, so the first judge on /try never waits for it
    // (about 40 s on the deployed API). A failure here is retried by the first demo sign-in.
    if (config.NODE_ENV !== 'test') {
      const t = Date.now();
      ensureDemoSeeded().then(
        () => console.log(`[demo] seeded in ${Date.now() - t} ms`),
        (err) => console.warn('[demo] warm-start seed failed; the first demo sign-in will retry', err),
      );
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

