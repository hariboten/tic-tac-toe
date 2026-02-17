import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.SNAPSHOT_PORT ?? 4200);
const url = process.env.SNAPSHOT_URL ?? `http://${host}:${port}`;
const outputPath = process.env.SNAPSHOT_OUTPUT_PATH ?? 'artifacts/ui-snapshot.png';
const waitTimeoutMs = Number(process.env.SNAPSHOT_WAIT_TIMEOUT_MS ?? 60000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(targetUrl) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the server becomes available.
    }

    await sleep(1000);
  }

  throw new Error(`Timed out waiting for ${targetUrl} after ${waitTimeoutMs}ms`);
}

function startDevServer() {
  const server = spawn('npx', ['ng', 'serve', '--host', host, '--port', String(port), '--no-open'], {
    stdio: 'inherit',
    shell: true,
  });

  server.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`ng serve exited with code ${code}`);
    }
  });

  return server;
}

async function main() {
  const server = startDevServer();

  try {
    await waitForServer(url);
    await mkdir(dirname(outputPath), { recursive: true });

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.screenshot({ path: outputPath, fullPage: true });
    } finally {
      await browser.close();
    }

    console.log(`UI snapshot saved to ${outputPath}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Executable doesn't exist")) {
      console.error('Playwright browser is missing. Run `npx playwright install chromium` and retry.');
    }

    throw error;
  } finally {
    server.kill('SIGTERM');
  }
}

await main();
