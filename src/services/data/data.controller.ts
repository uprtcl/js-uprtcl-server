import { Request, Response } from 'express';
import { DataService } from './data.service';
import { UprtclService } from '../uprtcl/uprtcl.service';
import { checkJwt } from '../../middleware/jwtCheck';
import { Secured, Commit, Signed, Hashed } from '../uprtcl/types';
import { getUserFromReq, SUCCESS, PostResult, GetResult } from '../../utils';

const propertyOrder = [
  'creatorsIds',
  'dataId',
  'message',
  'timestamp',
  'parentsIds',
];
declare global {
  namespace Express {
    interface Request {
      user: string;
    }
  }
}

const commitFilter = (data: any) => {
  return (
    data.object.payload !== undefined &&
    propertyOrder.every((p) => data.object.payload.hasOwnProperty(p))
  );
};

export class DataController {
  constructor(
    protected dataService: DataService,
    protected uprtclService: UprtclService
  ) {}

  routes() {
    return [
      {
        path: '/uprtcl/1/data',
        method: 'post',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const allDatas = req.body.datas;

            const commits = allDatas.filter((data: any) => commitFilter(data));
            const datas = allDatas.filter((data: any) => !commitFilter(data));

            await this.dataService.createDatas(datas, getUserFromReq(req));
            await this.uprtclService.createCommits(
              commits,
              getUserFromReq(req)
            );

            let result: PostResult = {
              result: SUCCESS,
              message: '',
              elementIds: [],
            };
            res.status(200).send(result);
          },
        ],
      },

      {
        path: '/uprtcl/1/data/:dataId',
        method: 'get',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const data = await this.dataService.getData(req.params.dataId);
            let result: GetResult<any> = {
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
