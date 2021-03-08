import { Entity } from '@uprtcl/evees';

import request from 'supertest';
import { createApp } from '../../server';
import { ipldService } from '../ipld/ipldService';
import { localCidConfig } from '../ipld';

export const createData = async (
  data: Object[],
  jwt: string
): Promise<Entity<Object>[]> => {
  const hashedPromises = data.map(async (obj) => {
    const dataId = await ipldService.generateCidOrdered(obj, localCidConfig);
    const hashedData: Entity<Object> = {
      id: dataId,
      object: obj,
    };
    return hashedData;
  });

  const hashedDatas = await Promise.all(hashedPromises);

  const router = await createApp();
  const post = await request(router)
    .post('/uprtcl/1/data')
    .send({ datas: hashedDatas })
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(post.status).toEqual(200);
  return hashedDatas;
};

export const getData = async (
  dataId: string,
  jwt: string
): Promise<Entity<any>> => {
  const router = await createApp();
  const get = await request(router)
    .get(`/uprtcl/1/data/${dataId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(get.status).toEqual(200);
  return JSON.parse(get.text).data;
};
