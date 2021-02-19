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
          // A Get with post, it receive the get and search options in the body
            {
                path: '/uprtcl/1/explore',
                method: 'post',
                handler: [
                    checkJwt,
                    async(req: Request, res: Response) => {
                        const perspectives = await this.searchService.explore(
                          req.body.searchOptions,
                          req.body.getPerspectiveOptions,
                          getUserFromReq(req)
                        );

                        try {
                          let result: GetResult<any[]> = {
                            result: SUCCESS,
                            message: 'search result',
                            data: perspectives,
                          };
  
                          res.status(200).send(result);
                        } catch(error) {
                          console.error(error);
                          let result: PostResult = {
                            result: ERROR,
                            message: error.message,
                            elementIds: [],
                          };
                          res.status(400).send(result);
                        }
                    }
                ]
            }
        ]
    }
}