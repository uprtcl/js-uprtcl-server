import request from 'supertest';
import { createApp } from '../../server';
import { Perspective, Commit, PerspectiveDetails, Secured } from './types';
import { PostResult, ExtendedMatchers, GetResult } from '../../utils';
import {
  LOCAL_EVEES_PROVIDER,
  LOCAL_EVEES_PATH,
  LOCAL_EVEES_REMOTE,
} from '../providers';
import { createData } from '../data/support.data';
import { DocNodeType } from '../data/types';
import { uprtclRepo } from '../access/access.testsupport';

export const createPerspective = async (
  creatorId: string,
  timestamp: number,
  context: string,
  jwt: string,
  headId?: string,
  parentId?: string
): Promise<string> => {
  const perspective: Perspective = {
    remote: LOCAL_EVEES_REMOTE,
    path: LOCAL_EVEES_PATH,
    creatorId: creatorId,
    timestamp: timestamp,
    context: context,
  };

  const secured: Secured<Perspective> = {
    id: '',
    object: {
      payload: perspective,
      proof: {
        signature: '',
        type: '',
      },
    },
  };
  const router = await createApp();
  const post = await request(router)
    .post('/uprtcl/1/persp')
    .send({ perspective: secured, details: { headId }, parentId: parentId })
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  let result: any = JSON.parse(post.text).elementIds[0];
  ((expect(result) as unknown) as ExtendedMatchers).toBeValidCid();

  return result;
};

export const updatePerspective = async (
  perspectiveId: string,
  details: PerspectiveDetails,
  jwt: string
): Promise<PostResult> => {
  const router = await createApp();
  const put = await request(router)
    .put(`/uprtcl/1/persp/${perspectiveId}/details`)
    .send(details)
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

  const secured: Secured<Commit> = {
    id: '',
    object: {
      payload: commit,
      proof: {
        signature: '',
        type: '',
      },
    },
  };
  const router = await createApp();
  const post = await request(router)
    .post(`/uprtcl/1/commit`)
    .send(secured)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  let result: any = JSON.parse(post.text).elementIds[0];
  ((expect(result) as unknown) as ExtendedMatchers).toBeValidCid();

  return result;
};

export const getPerspectiveRelatives = async (
  perspectiveId: string,
  relatives: 'ecosystem' | 'children'
): Promise<Array<string>> => {
  return await uprtclRepo.getPerspectiveRelatives(perspectiveId, relatives);
};

export const getIndependentPerspectives = async (
  perspectiveId: string
): Promise<Array<string>> => {
  return await uprtclRepo.getOtherIndpPerspectives(perspectiveId, false);
};

export const addPagesOrLinks = async (
  addedContent: Array<string>,
  pages: boolean,
  parents: Array<string>,
  jwt: string
): Promise<string> => {
  const creatorId = 'did:method:12345';
  const timestamp = Math.round(Math.random() * 100000);

  let data = {};

  if (pages) {
    data = { title: '', type: DocNodeType.title, pages: addedContent };
  } else {
    data = { text: '', type: DocNodeType.paragraph, links: addedContent };
  }

  const dataId = await createData(data, jwt);
  let commitId = await createCommit(
    [creatorId],
    timestamp,
    'sample message',
    parents,
    dataId,
    jwt
  );
  return commitId;
};

export const createCommitAndData = async (
  content: string,
  page: boolean,
  jwt: string
): Promise<string> => {
  const creatorId = 'did:method:12345';
  const timestamp = Math.round(Math.random() * 100000);

  let data = {};

  if (page) {
    data = { title: content, type: DocNodeType.title, pages: [] };
  } else {
    data = { text: content, type: DocNodeType.paragraph, links: [] };
  }

  const dataId = await createData(data, jwt);
  let commitId = await createCommit(
    [creatorId],
    timestamp,
    'sample message',
    [],
    dataId,
    jwt
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
