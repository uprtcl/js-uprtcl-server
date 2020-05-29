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
import { KnownSourcesRepository } from './knownsources/knownsources.repository';
import { KnownSourcesController } from './knownsources/knownsources.controller';
import { DataService } from './data/data.service';
import { DataController } from './data/data.controller';
import { KnownSourcesService } from './knownsources/knownsources.service';

export const getRoutes = async () => {
  /** poors man dependency injection */
  const dbService = new DGraphService(process.env.DGRAPH_HOST as string);

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
  const knownSourcesRepo = new KnownSourcesRepository(dbService);

  const dataService = new DataService(dbService, dataRepo);
  const dataController = new DataController(dataService);

  const accessService = new AccessService(dbService, accessRepo);
  const accessController = new AccessController(accessService);

  const uprtclService = new UprtclService(dbService, uprtclRepo, accessService);
  const uprtclController = new UprtclController(uprtclService);

  const userService = new UserService(dbService, userRepo);
  const userController = new UserController(userService);

  const knownSourcesService = new KnownSourcesService(
    dbService,
    knownSourcesRepo,
    dataService,
    uprtclService
  );
  const knownSourcesController = new KnownSourcesController(
    knownSourcesService
  );

  return [
    ...uprtclController.routes(),
    ...dataController.routes(),
    ...userController.routes(),
    ...accessController.routes(),
    ...knownSourcesController.routes(),
  ];
};
