import request from 'supertest';
import { createApp } from '../../server';
import { Hashed } from '../uprtcl/types';
import { ipldService } from '../ipld/ipldService';
import { localCidConfig } from '../ipld';

export const createData = async (
  data: Object,
  jwt: string
): Promise<string> => {
  const dataId = await ipldService.generateCidOrdered(
    data,
    localCidConfig
  );
  const hashedData: Hashed<Object> = {
    id: dataId,
    object: data,
  };
  const router = await createApp();
  const post = await request(router)
    .post('/uprtcl/1/data')
    .send({datas:[hashedData]})
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(post.status).toEqual(200);
  return dataId;
};

export const getData = async (
  dataId: string,
  jwt: string
): Promise<Hashed<any>> => {
  const router = await createApp();
  const get = await request(router)
    .get(`/uprtcl/1/data/${dataId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(get.status).toEqual(200);
  return JSON.parse(get.text).data;
};
