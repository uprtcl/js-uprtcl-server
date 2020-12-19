import { Request, Response } from 'express';
import { checksPlaceholder } from '../../middleware/checks';
import { UprtclService } from './uprtcl.service';
import { checkJwt } from '../../middleware/jwtCheck';
import {
  getUserFromReq,
  GetResult,
  SUCCESS,
  PostResult,
  ERROR,
} from '../../utils';
import {
  Secured,
  Perspective,
  PerspectiveDetails,
  Commit,
  Proposal,
} from './types';

declare global {
  namespace Express {
    interface Request {
      user: string;
    }
  }
}

export class UprtclController {
  constructor(protected uprtclService: UprtclService) {}

  routes() {
    return [
      {
        path: '/uprtcl/1/persp',
        method: 'post',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const elementIds = await this.uprtclService.createAndInitPerspectives(
              req.body.perspectives,
              getUserFromReq(req)
            );

            let result: PostResult = {
              result: SUCCESS,
              message: '',
              elementIds,
            };
            res.status(200).send(result);
          },
        ],
      },

      {
        path: '/uprtcl/1/persp/:perspectiveId',
        method: 'get',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              perspectiveId: req.params.perspectiveId,
              userId: getUserFromReq(req),
            };

            try {
              const perspective = await this.uprtclService.getPerspective(
                inputs.perspectiveId,
                inputs.userId
              );
              let result: GetResult<Secured<Perspective>> = {
                result: SUCCESS,
                message: '',
                data: perspective,
              };

              console.log('[UPRTCL CONTROLLER] getPerspective', {
                inputs: JSON.stringify(inputs),
                result: JSON.stringify(result),
              });

              res.status(200).send(result);
            } catch (error) {
              console.log(
                '[UPRTCL CONTROLLER] getPerspective - Error',
                JSON.stringify(inputs),
                error
              );

              let result: GetResult<null> = {
                result: ERROR,
                message: error.message,
                data: null,
              };

              res.status(200).send(result);
            }
          },
        ],
      },

      {
        path: '/uprtcl/1/persp/:perspectiveId/details',
        method: 'get',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              perspectiveId: req.params.perspectiveId,
              userId: getUserFromReq(req),
            };

            try {
              const data = await this.uprtclService.getPerspectiveDetails(
                inputs.perspectiveId,
                inputs.userId
              );

              let result: GetResult<PerspectiveDetails> = {
                result: SUCCESS,
                message: '',
                data: data,
              };

              console.log('[UPRTCL CONTROLLER] getPerspectiveDetails', {
                inputs: JSON.stringify(inputs),
                result: JSON.stringify(result),
              });

              res.status(200).send(result);
            } catch (error) {
              console.error(
                '[UPRTCL CONTROLLER] getPerspectiveDetails - Error',
                JSON.stringify(inputs),
                error
              );

              let result: GetResult<null> = {
                result: ERROR,
                message: error.message,
                data: null,
              };

              res.status(200).send(result);
            }
          },
        ],
      },

      {
        path: '/uprtcl/1/persp/details',
        method: 'put',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            try {
              await this.uprtclService.updatePerspectives(
                req.body.details,
                getUserFromReq(req)
              );

              let result: PostResult = {
                result: SUCCESS,
                message: 'perspective head updated',
                elementIds: [],
              };
              res.status(200).send(result);
            } catch (error) {
              console.error(error);
              let result: PostResult = {
                result: ERROR,
                message: error.message,
                elementIds: [],
              };
              res.status(400).send(result);
            }
          },
        ],
      },

      {
        path: '/uprtcl/1/persp/:perspectiveId',
        method: 'delete',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            try {
              await this.uprtclService.deletePerspective(
                req.params.perspectiveId,
                getUserFromReq(req)
              );

              let result: PostResult = {
                result: SUCCESS,
                message: 'perspective deleted',
                elementIds: [],
              };
              res.status(200).send(result);
            } catch (error) {
              console.error(error);
              let result: PostResult = {
                result: ERROR,
                message: error.message,
                elementIds: [],
              };
              res.status(400).send(result);
            }
          },
        ],
      },

      {
        path: "/uprtcl/1/persp/:perspectiveId/others",
        method: "get",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const inputs = {
              perspId: req.params.perspectiveId,
              eco: req.query.includeEcosystem,
            };

            try {
              let perspectives = await this.uprtclService.findIndPerspectives(
                inputs.perspId,
                inputs.eco === 'false'
                  ? false
                  : inputs.eco === 'true'
                  ? true
                  : inputs.eco === '' || inputs.eco === 'undefined'
                  ? false
                  : false,
                getUserFromReq(req)
              );

              let result: GetResult<string[]> = {
                result: SUCCESS,
                message: 'perspectives found',
                data: perspectives,
              };

              res.status(200).send(result);
            } catch (error) {
              console.log(error);
              let result: GetResult<string[]> = {
                result: ERROR,
                message: error.message,
                data: [],
              };
              res.status(400).send(result);
            }
          },
        ],
      },

      {
        path: '/uprtcl/1/persp',
        method: 'put',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            try {
              let perspectives = await this.uprtclService.findPerspectives(
                req.body.context,
                getUserFromReq(req)
              );

              let result: GetResult<string[]> = {
                result: SUCCESS,
                message: 'perspectives found',
                data: perspectives,
              };
              res.status(200).send(result);
            } catch (error) {
              console.error(error);
              let result: PostResult = {
                result: ERROR,
                message: error.message,
                elementIds: [],
              };
              res.status(400).send(result);
            }
          },
        ],
      },

      {
        path: '/uprtcl/1/commit',
        method: 'post',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const elementIds = await this.uprtclService.createCommits(
              [req.body],
              getUserFromReq(req)
            );
            let result: PostResult = {
              result: SUCCESS,
              message: '',
              elementIds,
            };
            res.status(200).send(result);
          },
        ],
      },

      {
        path: '/uprtcl/1/commit/:commitId',
        method: 'get',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const data = await this.uprtclService.getCommit(
              req.params.commitId,
              getUserFromReq(req)
            );
            let result: GetResult<Secured<Commit>> = {
              result: SUCCESS,
              message: '',
              data: data,
            };
            res.status(200).send(result);
          },
        ],
      },
    ];
  }
}
