import { env } from './config/env';
import { initDatabase } from './db/sequelize';
import app from './app';

(async () => {
  await initDatabase();
  const port = env.PORT;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log('Server listening on port ' + port);
  });
})();
