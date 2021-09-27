/** architecture from https://itnext.io/production-ready-node-js-rest-apis-setup-using-typescript-postgresql-and-redis-a9525871407 */

import http from 'http';
import express from 'express';
import middleware from './middleware';
import errorHandlers from './middleware/errorHandlers';
import { applyMiddleware, applyRoutes } from './utils';
import { routes } from './services/routes-debug';

process.on('uncaughtException', (e) => {
  console.log(e);
  process.exit(1);
});

process.on('unhandledRejection', (e) => {
  console.log(e);
  process.exit(1);
});

const router = express();
router.use(express.json({limit: '50mb'}));
applyMiddleware(middleware, router);
applyRoutes(routes, router);
applyMiddleware(errorHandlers, router);

const { PORT = 3100 } = process.env;
const server = http.createServer(router);

server.listen(PORT, () =>
  console.log(`Server is running http://localhost:${PORT}...`)
);

export { router };
