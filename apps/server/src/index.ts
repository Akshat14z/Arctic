import { buildApp } from './app.js';
import { getConfig } from './config.js';

async function main() {
  const config = getConfig();
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    console.log(`🚀 ConvoCart Platform Server listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

