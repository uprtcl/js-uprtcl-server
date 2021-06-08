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
  SearchForkOptions,
  SearchResult,
} from '@uprtcl/evees';
import { FetchResult } from './uprtcl.repository';
import { addNewElementsToPerspective } from './uprtcl.mock.helper';

const db = new DGraphService(
  process.env.DGRAPH_HOST as string,
  process.env.DGRAPH_PORT as string,
  ''
);

interface PerspectiveData {
  persp: string;
  commit: string;
}
export interface UpdateTest extends Update {
  context?: string;
}

export const forkPerspective = async (
  perspectiveId: string,
  user: TestUser
): Promise<string> => {
  const officialPerspective = await getPerspectiveDetails(perspectiveId, user);
  let officialData = officialPerspective.data.slice?.entities[1].object;
  const officialHead =
    officialPerspective.data.slice?.entities[0].object.payload;

  if (officialData.pages) {
    officialData.pages = [];
  } else if (officialData.links) {
    officialData.links = [];
  }

  const forkData = await createData([officialData], user.jwt);

  const forkCommit = await createData(
    [
      {
        proof: {
          signature: '',
          proof: '',
        },
        payload: {
          creatorsIds: [],
          dataId: forkData[0].hash,
          message: '',
          timestamp: Date.now(),
          parentsIds: officialHead.parentsIds,
        },
      },
    ],
    user.jwt
  );

  const perspectiveContext = await getPerspectivesContext([perspectiveId]);

  const forkedPerspective = await createPerspectives(user, [
    {
      perspectiveId: '',
      details: {
        headId: forkCommit[0].hash,
      },
      indexData: {
        text: officialData.text,
      },
      context: perspectiveContext[0],
    },
  ]);

  await sendPerspectiveBatch(forkedPerspective, user);

  const topElement = forkedPerspective[0].perspective.hash;

  const relatives = await getPerspectiveRelatives(perspectiveId, 'children');

  if (relatives.length > 0) {
    const children = await forkChildren(relatives, topElement, user);

    const updatedData = await createData(
      [
        {
          text: `${
            officialData.title ? officialData.title : officialData.text
          }`,
          type: `${officialData.title ? `title` : `text`}`,
          [`${officialData.pages ? `pages` : `links`}`]: children,
        },
      ],
      user.jwt
    );

    const commitUpdates = await createData(
      [
        {
          proof: {
            signature: '',
            proof: '',
          },
          payload: {
            creatorsIds: [],
            dataId: updatedData[0].hash,
            message: '',
            timestamp: Date.now(),
            parentsIds: [],
          },
        },
      ],
      user.jwt
    );
    // Update top element children
    await updatePerspective(user.jwt, undefined, undefined, [
      {
        perspectiveId: topElement,
        details: {
          headId: commitUpdates[0].hash,
        },
        indexData: {
          linkChanges: {
            children: {
              added: children,
              removed: [],
            },
          },
        },
      },
    ]);
  }

  return topElement;
};

const forkChildren = async (
  children: string[],
  guardianId: string,
  user: TestUser
): Promise<string[]> => {
  const officalPerspectives = await Promise.all(
    children.map(async (child) => {
      return {
        data: (await getPerspectiveDetails(child, user)).data,
      };
    })
  );
  let officialDatas = officalPerspectives.map(
    (persp) => persp.data.slice?.entities[1].object
  );
  const officialHeads = officalPerspectives.map(
    (persp) => persp.data.slice?.entities[0].object.payload
  );

  // Reset links or pages
  officialDatas.map((data) => {
    if (data.pages) {
      data.pages = [];
    } else if (data.links) {
      data.links = [];
    }
  });

  const forkedDatas = await createData(officialDatas, user.jwt);

  const forkedCommits = await createData(
    forkedDatas.map((data, i) => {
      return {
        proof: {
          signature: '',
          proof: '',
        },
        payload: {
          creatorsIds: [],
          dataId: data.hash,
          message: '',
          timestamp: Date.now(),
          parentsIds: officialHeads[i].parentsIds,
        },
      };
    }),
    user.jwt
  );

  const perspectivesContext = await getPerspectivesContext(children);

  const forkedPerspectives = await createPerspectives(
    user,
    forkedCommits.map((commit, i) => {
      return {
        perspectiveId: '',
        details: {
          headId: commit.hash,
          guardianId: guardianId,
        },
        indexData: {
          text: officialDatas[i].text,
        },
        context: perspectivesContext[i],
      };
    })
  );

  await sendPerspectiveBatch(forkedPerspectives, user);

  return forkedPerspectives.map((persp) => persp.perspective.hash);
};

const getPerspectivesContext = async (
  perspectivesIds: string[]
): Promise<string[]> => {
  await db.ready();
  // This is a temporal way of getting perspectives context.
  const query = `query{
    perspectives(func: eq(xid, ${perspectivesIds})) {
      context {
        name
      }
    }
  }`;

  const result = await db.client.newTxn().query(query);
  const perspectives = result.getJson().perspectives;
  const contexts = perspectives.map((persp: any) => persp.context.name);
  return !contexts || contexts.length == 0 ? [] : contexts;
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
  updates: UpdateTest[]
): Promise<NewPerspective[]> => {
  const perspectives = await Promise.all(
    updates.map(async (update, i) => {
      const perspective: Perspective = {
        remote: LOCAL_EVEES_REMOTE,
        path: LOCAL_EVEES_PATH,
        creatorId: user.userId.toLowerCase(),
        timestamp: Date.now(),
        context: update.context ? update.context : `${Date.now()}${i}`,
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
        hash: perspectiveId,
        object: securedObject,
        remote: '',
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
    hash: commitId,
    object: securedObject,
    remote: '',
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
  eco?: boolean,
  jwt?: string
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
): Promise<GetResult<SearchResult>> => {
  const router = await createApp();
  const get = await request(router)
    .put(`/uprtcl/1/explore`)
    .send({ searchOptions })
    .set('Authorization', user ? (user.jwt ? `Bearer ${user.jwt}` : '') : '');
  return JSON.parse(get.text);
};
