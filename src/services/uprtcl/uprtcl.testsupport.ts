import request from "supertest";
import { router } from "../../server";
import { Perspective, Commit, PerspectiveDetails, Secured } from "./types";
import { PostResult, ExtendedMatchers, GetResult } from "../../utils";
import { LOCAL_EVEES_PROVIDER } from "../knownsources/knownsources.repository";

export const createPerspective = async (
  creatorId: string, 
  timestamp: number, 
  jwt: string):Promise<string> => {
  
  const perspective: Perspective = {
    origin: LOCAL_EVEES_PROVIDER,
    creatorId: creatorId,
    timestamp: timestamp
  }

  const secured: Secured<Perspective> = {
    id: '',
    object: {
      payload: perspective,
      proof: {
        signature: '',
        type: ''
      }
    }
  }

  const post = await request(router).post('/uprtcl/1/persp')
  .send(secured)
  .set('Authorization', jwt ? `Bearer ${jwt}` : '');
  
  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

export const updatePerspective = async (
  perspectiveId: string, 
  details: PerspectiveDetails, 
  jwt: string) : Promise<PostResult> => {

  const put = await request(router).put(`/uprtcl/1/persp/${perspectiveId}/details`)
  .send(details)
  .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return JSON.parse(put.text);
}

export const createCommit = async (
  creatorsIds: string[], 
  timestamp: number, 
  message: string, 
  parentsIds: Array<string>, 
  dataId: string,
  jwt: string) : Promise<string> => {
  
  const commit: Commit = {
    creatorsIds: creatorsIds,
    timestamp: timestamp,
    message: message,
    parentsIds: parentsIds,
    dataId: dataId
  }

  const secured: Secured<Commit> = {
    id: '',
    object: {
      payload: commit,
      proof: {
        signature: '',
        type: ''
      }
    }
  }

  const post = await request(router).post(`/uprtcl/1/commit`)
  .send(secured)
  .set('Authorization', jwt ? `Bearer ${jwt}` : '');;

  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

export const getPerspective = async (perspectiveId: string, jwt: string):Promise<GetResult<Secured<Perspective>>> => {
  const get = await request(router)
    .get(`/uprtcl/1/persp/${perspectiveId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return JSON.parse(get.text);
}

export const getPerspectiveDetails = async (perspectiveId: string, jwt: string):Promise<GetResult<PerspectiveDetails>> => {
  const get = await request(router)
    .get(`/uprtcl/1/persp/${perspectiveId}/details`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');
  
  return JSON.parse(get.text);
}

export const getCommit = async (commitId: string, jwt: string):Promise<GetResult<Commit>> => {
  const get = await request(router)
    .get(`/uprtcl/1/commit/${commitId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');
  
  return JSON.parse(get.text);
}

export const findPerspectives = async (details: PerspectiveDetails, jwt: string):Promise<GetResult<Secured<Perspective>[]>> => {
  const get = await request(router)
    .get(`/uprtcl/1/persp`)
    .send(details)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return JSON.parse(get.text);
}

