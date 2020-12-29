import { Request, Response, NextFunction } from 'express';

export const checksPlaceholder = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next();
};
