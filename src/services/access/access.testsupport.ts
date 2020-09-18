import request from 'supertest';

import { PostResult } from '../../utils';
import { createApp } from '../../server';
import { PermissionType } from './access.schema';
import { AccessRepository } from "./access.repository";
import { UserRepository } from "../user/user.repository";
import { DGraphService } from "../../db/dgraph.service";
import { UprtclRepository } from '../uprtcl/uprtcl.repository';
import { DataRepository } from '../data/data.repository';

const db = new DGraphService("localhost:9080");
const userRepo = new UserRepository(db);
const accessRepo = new AccessRepository(db, userRepo);
const dataRepo = new DataRepository(db, userRepo);
export const uprtclRepo = new UprtclRepository(db, userRepo, dataRepo);

export const delegatePermissionsTo = async (
  elementId: string,
  delegate: boolean,
  delegateTo: string | undefined,
  jwt: string
): Promise<PostResult> => {
  const router = await createApp();
  const url = `/uprtcl/1/permissions/${elementId}/delegate/?delegate=${delegate}&delegateTo=${delegateTo}`;
  
  const put = await request(router)
    .put(url)
    .send()
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(put.status).toEqual(200);  

  return JSON.parse(put.text);
};

export const finDelegatedChildNodes = async (elementId: string) => {
  const childNodes = await accessRepo.getDelegatedFrom(elementId);

  const accessConfigs = childNodes.map(async (child) => {
    const accessConfig = await accessRepo.getAccessConfigOfElement(child);
    return accessConfig.finDelegatedTo;
  });

  return await Promise.all(
    accessConfigs
  );
};

export const getSecondLayerFinDelegatedTo = async (elementId: string) => {
  const elementIdAccessConfig = await accessRepo.getAccessConfigOfElement(
                                  elementId
                                );
  
  if(!elementIdAccessConfig.delegateTo) throw new Error("delegateTo not found");

  const delegateToAccessConfig = await accessRepo.getAccessConfigOfElement(
                                  elementIdAccessConfig.delegateTo
                                 );
                                
  if(!delegateToAccessConfig.finDelegatedTo) throw new Error("finDelegatedTo not found");

  return delegateToAccessConfig.finDelegatedTo;
};

export const getAccessConfigOfElement = async (elementId: string) => {
  return await accessRepo.getAccessConfigOfElement(elementId);
};

export const getPermissionsConfig = async (permissionsUid: string) => {
  return await accessRepo.getPermissionsConfig(permissionsUid);
};

export const addPermission = async (
  elementId: string,
  userToAddId: string,
  type: PermissionType,
  jwt: string
): Promise<PostResult> => {
  const router = await createApp();
  const put = await request(router)
    .put(`/uprtcl/1/permissions/${elementId}/single`)
    .send({
      type: type,
      userId: userToAddId,
    })
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(put.status).toEqual(200);

  return JSON.parse(put.text);
};

export const setPublicPermission = async (
  elementId: string,
  type: PermissionType,
  value: boolean,
  jwt: string
): Promise<PostResult> => {
  const router = await createApp();
  const put = await request(router)
    .put(`/uprtcl/1/permissions/${elementId}/public`)
    .send({
      type: type,
      value: value,
    })
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(put.status).toEqual(200);

  return JSON.parse(put.text);
};
