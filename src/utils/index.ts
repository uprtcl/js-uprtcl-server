import { Router, Request, Response, NextFunction } from 'express';
var CID = require('cids');

type Wrapper = (router: Router) => void;

export const applyMiddleware = (
  middlewareWrappers: Wrapper[],
  router: Router
) => {
  for (const wrapper of middlewareWrappers) {
    wrapper(router);
  }
};

type Handler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

type Route = {
  path: string;
  method: string;
  handler: Handler | Handler[];
};

export const applyRoutes = (routes: Route[], router: Router) => {
  for (const route of routes) {
    const { method, path, handler } = route;
    (router as any)[method](path, handler);
  }
};

export const getUserFromReq = (req: Request) => {
  return req.user ? (req.user !== '' ? req.user : null) : null;
};

export const SUCCESS = 'success';
export const ERROR = 'error';
export const NOT_AUTHORIZED_MSG = 'not authorized';

export interface PostResult {
  result: string;
  message: string;
  elementIds: string[];
}

export interface GetResult<T> {
  result: string;
  message: string;
  data: T;
}

export const toBeValidCid = (received: any) => {
  if (CID.isCID(new CID(received))) {
    return {
      message: () => {
        return `expected ${received} not to be a valid cid`;
      },
      pass: true,
    };
  } else {
    return {
      message: () => {
        return `expected ${received} to be a valid cid`;
      },
      pass: false,
    };
  }
};
export interface ExtendedMatchers extends jest.Matchers<void, any> {
  toBeValidCid: () => object;
}
