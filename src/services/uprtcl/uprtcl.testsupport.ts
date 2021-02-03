import request from 'supertest';
import { createApp } from '../../server';
import { Perspective, Commit, PerspectiveDetails, Secured, UpdateDetails } from './types';
import { PostResult, ExtendedMatchers, GetResult } from '../../utils';
import {
  LOCAL_EVEES_PROVIDER,
  LOCAL_EVEES_PATH,
  LOCAL_EVEES_REMOTE,
} from '../providers';
import { createData } from '../data/support.data';
import { DocNodeType } from '../data/types';
import { uprtclRepo } from '../access/access.testsupport';
import { ipldService } from '../ipld/ipldService';
import { localCidConfig } from '../ipld';
import { TestUser } from '../user/user.testsupport';

interface PerspectiveData {
  persp: string;
  commit: string;
}

export const forkPerspective = async (
  perspectiveId: string,
  user: TestUser,
  parent?: PerspectiveData
): Promise<any> => {
  const timestamp = Math.floor(100000 + Math.random() * 900000);

  const persp = await getPerspective(perspectiveId, user.jwt);
  const {
    data: {
      object: {
        payload: { creatorId, context },
      },
    },
  } = persp;

  const forkedPersp = await createAndInitPerspective(
    '',
    false,
    user,
    timestamp,
    context
  );

  if (parent) {
    await addChildToPerspective(
      forkedPersp.persp,
      parent.persp,
      parent.commit,
      false,
      user
    );
  }

  const children = (
    await getPerspectiveRelatives(perspectiveId, 'children')
  ).map(async (child) => {
    try {
      return await forkPerspective(child, user, forkedPersp);
    } catch {
      return;
    }
  });

  await Promise.all(children);

  return parent ? parent.persp : forkedPersp.persp;
};

export const addChildToPerspective = async (
  childId: string,
  parentId: string,
  parentCommit: string,
  pages: boolean,
  user: TestUser
): Promise<void> => {
  const commitChild = await addPagesOrLinks(
    [childId],
    pages,
    [parentCommit],
    user
  );

  await updatePerspective(
    user.jwt,
    parentId,
    {
      headId: commitChild,
      name: '',
    }
  );
};

export const createAndInitPerspective = async (
  content: string,
  pages: boolean,
  user: TestUser,
  timestamp: number,
  context: string
): Promise<PerspectiveData> => {
  const commit = await createCommitAndData(content, pages, user);

  return {
    persp: await createPerspective(user, timestamp, context, user.jwt, commit),
    commit: commit,
  };
};

export const createPerspective = async (
  user: TestUser,
  timestamp: number,
  context: string,
  headId?: string,
  parentId?: string
): Promise<string> => {
  const perspective: Perspective = {
    remote: LOCAL_EVEES_REMOTE,
    path: LOCAL_EVEES_PATH,
    creatorId: user.userId.toLowerCase(),
    timestamp: timestamp,
    context: context,
  };

  const securedObject = {
    payload: perspective,
      proof: {
        signature: '',
        type: '',
      },
  }

  const perspectiveId = await ipldService.generateCidOrdered(
    securedObject,
    localCidConfig
  );

  const secured: Secured<Perspective> = {
    id: perspectiveId,
    object: securedObject
  };
  const router = await createApp();
  const post = await request(router)
    .post('/uprtcl/1/persp')
    .send({ perspectives: [
              { perspective: secured, 
                details: { headId: headId }, 
                parentId: parentId 
              }
            ]
          })
    .set('Authorization', user.jwt ? `Bearer ${user.jwt}` : '');

  expect(post.status).toEqual(200);
  return perspectiveId;
};

export const updatePerspective = async (
  jwt: string,
  perspectiveId?: string,
  details?: PerspectiveDetails,
  updatesBatch?: UpdateDetails[]
): Promise<PostResult> => {
  const router = await createApp();
  const put = await request(router)
    .put(`/uprtcl/1/persp/details`)
    .send({
      details: (perspectiveId) ? [
        {
          id: perspectiveId,
          details
        }
      ] : updatesBatch
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
      }
  }
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

export const addPagesOrLinks = async (
  addedContent: Array<string>,
  pages: boolean,
  parents: Array<string>,
  user: TestUser
): Promise<string> => {
  const timestamp = Math.round(Math.random() * 100000);

  let data = {};

  if (pages) {
    data = { title: '', type: DocNodeType.title, pages: addedContent };
  } else {
    data = { text: '', type: DocNodeType.paragraph, links: addedContent };
  }

  const dataId = await createData(data, user.jwt);
  let commitId = await createCommit(
    [user.userId.toLowerCase()],
    timestamp,
    'sample message',
    parents,
    dataId,
    user.jwt
  );
  return commitId;
};

export const createCommitAndData = async (
  content: string,
  page: boolean,
  user: TestUser 
): Promise<string> => {
  const timestamp = Math.round(Math.random() * 100000);

  let data = {};

  if (page) {
    data = { title: content, type: DocNodeType.title, pages: [] };
  } else {
    data = { text: content, type: DocNodeType.paragraph, links: [] };
  }

  const dataId = await createData(data, user.jwt);
  let commitId = await createCommit(
    [user.userId.toLowerCase()],
    timestamp,
    'sample message',
    [],
    dataId,
    user.jwt
  );
  return commitId;
};

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
  jwt: string
): Promise<GetResult<PerspectiveDetails>> => {
  const router = await createApp();
  const get = await request(router)
    .get(`/uprtcl/1/persp/${perspectiveId}/details`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');
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

export const sendPerspectiveBatch = async (perspectives: Object[], user: TestUser) : Promise<void> => {
  const router = await createApp();
  const post = await request(router)
    .post('/uprtcl/1/persp')
    .send({ perspectives: perspectives })
    .set('Authorization', user.jwt ? `Bearer ${user.jwt}` : '');

  expect(post.status).toEqual(200);
}

export const sendDataBatch = async (datas: Object[], user: TestUser) : Promise<void> => {
  const router = await createApp();
  const post = await request(router)
    .post('/uprtcl/1/data')
    .send({datas:datas})
    .set('Authorization', user.jwt ? `Bearer ${user.jwt}` : '');

  expect(post.status).toEqual(200);
}
