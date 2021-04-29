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

            /** all entities are stored in plain text */
            const resultDatas = await this.dataService.createDatas(
              allDatas,
              getUserFromReq(req)
            );

            /** explicitely store structured commits to link them to other elements */
            const commits = allDatas.filter((data: any) => commitFilter(data));

            const resultCommits = await this.uprtclService.createCommits(
              commits,
              getUserFromReq(req)
            );

            let result: PostEntityResult = {
              result: SUCCESS,
              message: '',
              entities: Array.prototype.concat(
                [],
                resultDatas.concat(resultCommits)
              ),
            };
            res.status(200).send(result);
          },
        ],
      },

      {
        path: '/uprtcl/1/data',
        method: 'get',
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const hashes = req.body.hashes as string[];
            const data = await this.dataService.getData(hashes);
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
