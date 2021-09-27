import { DGraphService } from '../db/dgraph.service';
import { UprtclController } from './uprtcl/uprtcl.controller';
import { UprtclService } from './uprtcl/uprtcl.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { AccessService } from './access/access.service';
import { AccessController } from './access/access.controller';
import { AccessRepository } from './access/access.repository';
import { UserRepository } from './user/user.repository';
import { UprtclRepository } from './uprtcl/uprtcl.repository';
import { DataRepository } from './data/data.repository';
import { DataService } from './data/data.service';
import { DataController } from './data/data.controller';
import { ProposalsController } from './proposals/proposals.controller';
import { ProposalsService } from './proposals/proposals.service';
import { ProposalsRepository } from './proposals/proposals.repository';

export const getRoutes = async () => {
  /** poors man dependency injection */
  const dbService = new DGraphService(
    process.env.DGRAPH_HOST as string,
    process.env.DGRAPH_PORT as string,
    process.env.SLASH_API_KEY as string
  );

  // Make sure that DGraph DB is connected properly before
  // proceeding to start the API.
  await dbService
    .ready()
    .then(() => console.log('DB ready'))
    .catch(console.log);

  const userRepo = new UserRepository(dbService);
  const accessRepo = new AccessRepository(dbService, userRepo);
  const dataRepo = new DataRepository(dbService, userRepo);
  const uprtclRepo = new UprtclRepository(dbService, userRepo, dataRepo);

  const accessService = new AccessService(dbService, accessRepo);
  const accessController = new AccessController(accessService);

  const dataService = new DataService(dbService, dataRepo);
  const uprtclService = new UprtclService(
    dbService,
    uprtclRepo,
    accessService,
    dataService
  );

  const dataController = new DataController(dataService, uprtclService);
  const uprtclController = new UprtclController(uprtclService);

  const userService = new UserService(dbService, userRepo);
  const userController = new UserController(userService);

  const proposalsRepo = new ProposalsRepository(dbService, userRepo);
  const proposalsService = new ProposalsService(
    accessService,
    proposalsRepo,
    dataService,
    uprtclService
  );
  const proposalsController = new ProposalsController(proposalsService);

  return [
    ...uprtclController.routes(),
    ...dataController.routes(),
    ...userController.routes(),
    ...accessController.routes(),
    ...proposalsController.routes(),
  ];
};
