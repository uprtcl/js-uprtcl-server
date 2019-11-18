import request from "supertest";
import { router } from "../../server";
import { Perspective, Commit } from "./types";
import { PostResult, ExtendedMatchers } from "../../utils";

export const createPerspective = async (
  creatorId: string, 
  timestamp: number, 
  jwt: string):Promise<string> => {
  
  const perspective: Perspective = {
    origin: '',
    creatorId: creatorId,
    timestamp: timestamp
  }

  const post = await request(router).post('/uprtcl/1/persp')
  .send(perspective)
  .set('Authorization', jwt ? `Bearer ${jwt}` : '');
  
  expect(post.status).toEqual(200);

  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

export const updatePerspective = async (
  perspectiveId: string, 
  headId: string, 
  jwt: string) : Promise<PostResult> => {

  const put = await request(router).put(`/uprtcl/1/persp/${perspectiveId}?headId=${headId}`)
  .send()
  .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(put.status).toEqual(200);

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

  const post = await request(router).post(`/uprtcl/1/commit`)
  .send(commit)
  .set('Authorization', jwt ? `Bearer ${jwt}` : '');;

  expect(post.status).toEqual(200);
  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

export const getPerspective = async (perspectiveId: string, jwt: string):Promise<Perspective> => {
  const get = await request(router)
    .get(`/uprtcl/1/persp/${perspectiveId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(get.status).toEqual(200);
  
  return JSON.parse(get.text).data;
}

export const getPerspectiveHead = async (perspectiveId: string, jwt: string):Promise<string> => {
  const get = await request(router)
    .get(`/uprtcl/1/persp/${perspectiveId}/head`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(get.status).toEqual(200);
  
  return JSON.parse(get.text).data;
}

export const getCommit = async (commitId: string, jwt: string):Promise<Commit> => {
  const get = await request(router)
    .get(`/uprtcl/1/commit/${commitId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(get.status).toEqual(200);
  
  return JSON.parse(get.text).data;
}

