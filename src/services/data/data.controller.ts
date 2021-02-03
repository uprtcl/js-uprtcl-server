import { Request, Response } from 'express';
import { DataService } from './data.service';
import { UprtclService } from '../uprtcl/uprtcl.service';
import { checkJwt } from '../../middleware/jwtCheck';
import {
  getUserFromReq,
  SUCCESS,
  PostEntityResult,
  GetResult,
} from '../../utils';

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

            const resultDatas = await this.dataService.createDatas(
              datas,
              getUserFromReq(req)
            );
            const resultCommits = await this.uprtclService.createCommits(
              commits,
              getUserFromReq(req)
            );

            let result: PostEntityResult = {
              result: SUCCESS,
              message: '',
              entities: Array.prototype.concat(
                [],
                [resultDatas, resultCommits]
              ),
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
