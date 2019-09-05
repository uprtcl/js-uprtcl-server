import { Request, Response } from "express";
import { createContext } from "./uprtclService";
import { checksPlaceholder } from "../../middleware/checks";

export default [
  {
    path: "/uprtcl/1/ctx",
    method: "post",
    handler: [
      checksPlaceholder,
      async ({ body }: Request, res: Response) => {
        const result = await createContext(body, '');
        res.status(200).send(result);
      }
    ]
  }
];