/** architecture from https://itnext.io/production-ready-node-js-rest-apis-setup-using-typescript-postgresql-and-redis-a9525871407 */
import { APIGatewayProxyHandler } from 'aws-lambda';
import awsServerlessExpress from 'aws-serverless-express';
import express from 'express';
import middleware from './middleware';
import errorHandlers from './middleware/errorHandlers';
import { applyMiddleware, applyRoutes } from './utils';
import { getRoutes } from './services';

process.on('uncaughtException', (e) => {
  console.log(e);
  process.exit(1);
});

process.on('unhandledRejection', (e) => {
  console.log(e);
  process.exit(1);
});

const createApp = async () => {
  const router = express();
  const routes = await getRoutes();
  applyMiddleware(middleware, router);
  applyRoutes(routes, router);
  applyMiddleware(errorHandlers, router);

  return router;
};

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log('running here...');
  const router = await createApp();
  const app = awsServerlessExpress.createServer(router);
  return awsServerlessExpress.proxy(app, event, context, 'PROMISE').promise;
};
