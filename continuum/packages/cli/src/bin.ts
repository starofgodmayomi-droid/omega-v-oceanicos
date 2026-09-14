import { OceanicosCLI, CLIResult } from './index.js';

const cli = new OceanicosCLI();
const args = process.argv.slice(2);

cli
  .run(args)
  .then((res: CLIResult) => {
    /* eslint-disable no-console */
    console.log(res.message);
    if (res.output) {
      console.log(JSON.stringify(res.output, null, 2));
    }
    process.exit(res.success ? 0 : 1);
  })
  .catch((err: Error) => {
    console.error('[Ω∞v CLI Error]', err.message);
    process.exit(1);
  });
