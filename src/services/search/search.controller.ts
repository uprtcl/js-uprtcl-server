import { Request, Response } from 'express';
import { PerspectiveGetResult } from '@uprtcl/evees';
import { checkJwt } from '../../middleware/jwtCheck';
import {
  getUserFromReq,
  GetResult,
  SUCCESS,
  PostResult,
  ERROR,
} from '../../utils';

import { SearchService } from "./search.service";

declare global {
  namespace Express {
    interface Request {
        user: string;
    }
  }
}

export class SearchController {
    constructor(protected searchService: SearchService) {}

    routes() {
        return [
            {
                path: '/uprtcl/1/explore',
                method: 'get',
                handler: [
                    checkJwt,
                    async(req: Request, res: Response) => {
                        
                    }
                ]
            }
        ]
    }
}