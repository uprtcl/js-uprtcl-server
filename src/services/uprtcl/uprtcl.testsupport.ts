import request from 'supertest';
import { createApp } from '../../server';
import { PostResult, GetResult } from '../../utils';
import { LOCAL_EVEES_PATH, LOCAL_EVEES_REMOTE } from '../providers';
import { DGraphService } from '../../db/dgraph.service';
import { createData } from '../data/test.support.data';
import { DocNodeType } from '../data/types';
import { uprtclRepo } from '../access/access.testsupport';
import { ipldService } from '../ipld/ipldService';
import { localCidConfig } from '../ipld';
import { TestUser } from '../user/user.testsupport';
import {
  Perspective,
  Secured,
  PerspectiveDetails,
  PerspectiveGetResult,
  Commit,
  Update,
  NewPerspective,
  SearchOptions,
} from '@uprtcl/evees';
import { FetchResult } from './uprtcl.repository';
import { addNewElementToPerspective } from './uprtcl.mock.helper';

const db = new DGraphService(
  process.env.DGRAPH_HOST as string, 
  process.env.DGRAPH_PORT as string, 
  ''
);

interface PerspectiveData {
  persp: string;
  commit: string;
}

export const forkPerspective = async (
  perspectiveId: string,
  user: TestUser,
  parentId?: string,
  topElement?: string,
): Promise<string> => {
  const officialPerspective = await getPerspectiveDetails(perspectiveId, user);  
  let officialData = officialPerspective.data.slice?.entities[1].object;
  const officialHead = officialPerspective.data.slice?.entities[0].object.payload;
  
  if(officialData.pages) {
    officialData.pages = [];
  } else if(officialData.links) {
    officialData.links = [];
  }

  const forkData = await createData(
    [officialData],
    user.jwt
  );

  const forkCommit = await createData(
    [
      {
        proof: {
          signature: '',
          proof: '',
        },
        payload: {
          creatorsIds: [],
          dataId: forkData[0].id,
          message: '',
          timestamp: Date.now(),
          parentsIds: officialHead.parentsIds,
        },
      }
    ],
    user.jwt
  );

  const forkedPerspective = await createPerspectives(
    user,
    [
      {
        perspectiveId: '',
        details: {
          headId: forkCommit[0].id,
          guardianId: parentId
        },
        text: officialData.text
      }
    ],
  );

  await sendPerspectiveBatch(forkedPerspective, user);

  if (parentId) {
    await addNewElementToPerspective(parentId, forkedPerspective[0].perspective.id, user);
  } else {
    topElement = forkedPerspective[0].perspective.id;
  }

  const children = (
    await getPerspectiveRelatives(perspectiveId, 'children')
  ).map(async (child) => {
    try {
      return await forkPerspective(child, user, forkedPerspective[0].perspective.id);
    } catch {
      return;
    }
  });

  await Promise.all(children);

  return topElement || '';
};

export const addChildToPerspective = async (
  childId: string,
  parentId: string,
  parentCommit: string,
  pages: boolean,
  user: TestUser
): Promise<void> => {
  // const commitChild = await addPagesOrLinks(
  //   [childId],
  //   pages,
  //   [parentCommit],
  //   user
  // );
  // await updatePerspective(user.jwt, parentId, {
  //   headId: commitChild,
  // });
};

// export const createAndInitPerspective = async (
//   content: string,
//   pages: boolean,
//   user: TestUser,
//   timestamp: number,
//   context: string
// ): Promise<PerspectiveData> => {
//   const commit = await createCommitAndData(content, pages, user);

//   return {
//     persp: await createPerspective(user, timestamp, context, user.jwt, commit),
//     commit: commit,
//   };
// };

export const createPerspectives = async (
  user: TestUser,
  updates: Update[]
): Promise<NewPerspective[]> => {
  const perspectives = await Promise.all(
    updates.map(async (update, i) => {
      const perspective: Perspective = {
        remote: LOCAL_EVEES_REMOTE,
        path: LOCAL_EVEES_PATH,
        creatorId: user.userId.toLowerCase(),
        timestamp: Date.now(),
        context: `${i}`,
      };

      const securedObject = {
        payload: perspective,
        proof: {
          signature: '',
          type: '',
        },
      };

      const perspectiveId = await ipldService.generateCidOrdered(
        securedObject,
        localCidConfig
      );

      const secured: Secured<Perspective> = {
        id: perspectiveId,
        object: securedObject,
      };

      update.perspectiveId = perspectiveId;

      return {
        perspective: secured,
        update: update,
      };
    })
  );
  return perspectives;
};

export const updatePerspective = async (
  jwt: string,
  perspectiveId?: string,
  details?: PerspectiveDetails,
  updatesBatch?: Update[]
): Promise<PostResult> => {
  const router = await createApp();
  const put = await request(router)
    .put(`/uprtcl/1/persp/update`)
    .send({
      updates: perspectiveId
        ? [
            {
              id: perspectiveId,
              details,
            },
          ]
        : updatesBatch,
    })
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');
  return JSON.parse(put.text);
};

export const createCommit = async (
  creatorsIds: string[],
  timestamp: number,
  message: string,
  parentsIds: Array<string>,
  dataId: string,
  jwt: string
): Promise<string> => {
  const commit: Commit = {
    creatorsIds: creatorsIds,
    timestamp: timestamp,
    message: message,
    parentsIds: parentsIds,
    dataId: dataId,
  };

  const securedObject = {
    payload: commit,
    proof: {
      signature: '',
      type: '',
    },
  };
  const commitId = await ipldService.generateCidOrdered(
    securedObject,
    localCidConfig
  );

  const secured: Secured<Commit> = {
    id: commitId,
    object: securedObject,
  };

  const router = await createApp();
  const post = await request(router)
    .post(`/uprtcl/1/commit`)
    .send(secured)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(post.status).toEqual(200);
  return commitId;
};

export const getPerspectiveRelatives = async (
  perspectiveId: string,
  relatives: 'ecosystem' | 'children'
): Promise<Array<string>> => {
  return await uprtclRepo.getPerspectiveRelatives(perspectiveId, relatives);
};

export const getIndependentPerspectives = async (
  perspectiveId: string,
  jwt: string,
  eco?: boolean
): Promise<GetResult<String[]>> => {
  const router = await createApp();
  const get = await request(router)
    .get(`/uprtcl/1/persp/${perspectiveId}/others?includeEcosystem=${eco}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return JSON.parse(get.text);
};

// export const addPagesOrLinks = async (
//   addedContent: Array<string>,
//   pages: boolean,
//   parents: Array<string>,
//   user: TestUser
// ): Promise<string> => {
//   const timestamp = Math.round(Math.random() * 100000);

//   let data = {};

//   if (pages) {
//     data = { title: '', type: DocNodeType.title, pages: addedContent };
//   } else {
//     data = { text: '', type: DocNodeType.paragraph, links: addedContent };
//   }

//   const dataId = await createData(data, user.jwt);
//   let commitId = await createCommit(
//     [user.userId.toLowerCase()],
//     timestamp,
//     'sample message',
//     parents,
//     dataId,
//     user.jwt
//   );
//   return commitId;
// };

// export const createCommitAndData = async (
//   user: TestUser,
//   data: object[]
// ): Promise<string> => {
//   const timestamp = Math.round(Math.random() * 100000);

//   const dataResults = await createData(data, user.jwt);
//   // let commitId = await createCommit(
//   //   [user.userId.toLowerCase()],
//   //   timestamp,
//   //   'sample message',
//   //   [],
//   //   dataId,
//   //   user.jwt
//   // );
//   console.log(dataResults);
//   return '';
// };

export const getPerspective = async (
  perspectiveId: string,
  jwt: string
): Promise<GetResult<Secured<Perspective>>> => {
  const router = await createApp();
  const get = await request(router)
    .get(`/uprtcl/1/persp/${perspectiveId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return JSON.parse(get.text);
};

export const getPerspectiveDetails = async (
  perspectiveId: string,
  user: TestUser
): Promise<GetResult<PerspectiveGetResult>> => {
  const router = await createApp();
  const get = await request(router)
    .put(`/uprtcl/1/persp/${perspectiveId}`)
    .send({
      userId: user.userId,
      levels: 0,
      entities: true,
    })
    .set('Authorization', user.jwt ? `Bearer ${user.jwt}` : '');
  return JSON.parse(get.text);
};

export const deletePerspective = async (
  perspectiveId: string,
  jwt: string
): Promise<GetResult<PerspectiveDetails>> => {
  const router = await createApp();
  const get = await request(router)
    .delete(`/uprtcl/1/persp/${perspectiveId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return JSON.parse(get.text);
};

export const getCommit = async (
  commitId: string,
  jwt: string
): Promise<GetResult<Commit>> => {
  const router = await createApp();
  const get = await request(router)
    .get(`/uprtcl/1/commit/${commitId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return JSON.parse(get.text);
};

export const findPerspectives = async (
  details: { context: string },
  jwt: string
): Promise<GetResult<string[]>> => {
  const router = await createApp();
  const get = await request(router)
    .put(`/uprtcl/1/persp`)
    .send(details)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return JSON.parse(get.text);
};

export const sendPerspectiveBatch = async (
  perspectives: Object[],
  user: TestUser
): Promise<void> => {
  const router = await createApp();
  const post = await request(router)
    .post('/uprtcl/1/persp')
    .send({ perspectives: perspectives })
    .set('Authorization', user.jwt ? `Bearer ${user.jwt}` : '');

  expect(post.status).toEqual(200);
};

export const sendDataBatch = async (
  datas: Object[],
  user: TestUser
): Promise<void> => {
  const router = await createApp();
  const post = await request(router)
    .post('/uprtcl/1/data')
    .send({ datas: datas })
    .set('Authorization', user.jwt ? `Bearer ${user.jwt}` : '');

  expect(post.status).toEqual(200);
};

export const getEcosystem = async (
  perspectiveId: string
): Promise<string[]> => {
  await db.ready();

  // This is a temporal way of fetching the ecosystem of each perspective.
  const query = `query{
    perspective(func: eq(xid, ${perspectiveId})) {
      ecosystem {
        xid
      }
    }
  }`;

  const result = await db.client.newTxn().query(query);
  const ecosystems = result.getJson().perspective[0].ecosystem;
  const ids = ecosystems.map((ecosystem: any) => ecosystem.xid);

  return !ids || ids.length == 0 ? [] : ids;
};

export const explore = async (
  searchOptions: SearchOptions,
  user?: TestUser
): Promise<GetResult<FetchResult>> => {
  const router = await createApp();
  const get = await request(router)
    .put(`/uprtcl/1/explore`)
    .send({ searchOptions })
    .set('Authorization', user ? (user.jwt ? `Bearer ${user.jwt}` : '') : '');
  return JSON.parse(get.text);
};
