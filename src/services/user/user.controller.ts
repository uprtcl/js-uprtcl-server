import { Request, Response } from "express";
import { checksPlaceholder } from "../../middleware/checks";
import { UserService } from "./user.service";
import { GetResult } from "../uprtcl/types";

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
        path: "/uprtcl/1/user/:userId/nonce",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params, }: Request, res: Response) => {
            const data = await this.userService.getNonce(params.userId);
              let result: GetResult = {
                result: SUCCESS,
                message: '',
                data: data
              }
              res.status(200).send(result);
          }
        ]
      }
    ]
  }
};