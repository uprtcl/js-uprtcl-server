import { Request, Response } from "express";
import { checksPlaceholder } from "../../middleware/checks";
import { UserService } from "./user.service";
import { checkJwt } from "../../middleware/jwtCheck";
import { GetResult } from "../../utils";

const SUCCESS = 'success';

export class UserController {

  constructor(protected userService: UserService) {
  }

  setUserService(userService: UserService) {
    this.userService = userService;
  }

  routes() {
    return [
      {
        path: "/uprtcl/1/user/:userId",
        method: "get",
        handler: [
          checkJwt,
          async ( req: any, res: Response) => {
            console.log('[USER-CONTROLLER] Authenticated user', {user: req.user});
            const user = await this.userService.get(req.params.userId);
              let result: GetResult<Object> = {
                result: SUCCESS,
                message: '',
                data: user
              }
              res.status(200).send(result);
          }
        ]
      },
      {
        path: "/uprtcl/1/user/:userId/nonce",
        method: "get",
        handler: [
          checkJwt,
          async ( req: any, res: Response) => {
            const nonce = await this.userService.getNonce(req.params.userId);
              let result: GetResult<String> = {
                result: SUCCESS,
                message: '',
                data: nonce
              }
              res.status(200).send(result);
          }
        ]
      },
      {
        path: "/uprtcl/1/user/:userId/authorize",
        method: "put",
        handler: [
          checkJwt,
          async ( req: any, res: Response) => {
            const jwt = await this.userService.getJwt(req.params.userId, req.body.signature);
            let result: GetResult<Object> = {
              result: SUCCESS,
              message: '',
              data: {jwt}
            }
            res.status(200).send(result);
          }
        ]
      }
    ]
  }
};