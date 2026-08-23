import { OceanicosCLI } from './index.js';

const cli = new OceanicosCLI();
const args = process.argv.slice(2);

cli
  .run(args)
  .then((res) => {
    /* eslint-disable no-console */
    console.log(res.message);
    if (res.output) {
      console.log(JSON.stringify(res.output, null, 2));
    }
    process.exit(res.success ? 0 : 1);
  })
  .catch((err) => {
    /* eslint-disable no-console */
    console.error('[Ω∞v CLI Error]', err.message);
    process.exit(1);
  });
