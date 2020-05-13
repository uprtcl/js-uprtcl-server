import request from 'supertest';

import { PostResult } from '../../utils';
import { AccessConfig } from './access.repository';
import { createApp } from '../../server';
import { PermissionType } from './access.schema';

export const delegatePermissionsTo = async (
  elementId: string,
  delegateTo: string,
  jwt: string
): Promise<PostResult> => {
  const router = await createApp();
  const accessConfig: AccessConfig = {
    delegate: true,
    delegateTo: delegateTo,
  };

  const put = await request(router)
    .put(`/uprtcl/1/accessConfig/${elementId}`)
    .send(accessConfig)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(put.status).toEqual(200);

  return JSON.parse(put.text);
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
