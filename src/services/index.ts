import { DGraphService } from "../db/dgraph.service";
import { UprtclController } from "./uprtcl/uprtcl.controller";
import { UprtclService } from "./uprtcl/uprtcl.service";
import { UserController } from "./user/user.controller";
import { UserService } from "./user/user.service";

/** poors man dependency injection */
const dbService = new DGraphService('localhost:9080');

const uprtclService = new UprtclService(dbService);
const uprtclController = new UprtclController(uprtclService);

const userService = new UserService(dbService);
const userController = new UserController(userService);

export const routes = [...uprtclController.routes(), ...userController.routes()];