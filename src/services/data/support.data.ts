import request from 'supertest';
import { createApp } from '../../server';
import { Hashed } from '../uprtcl/types';

export const createData = async (
  data: Object,
  jwt: string
): Promise<string> => {
  const hashedData: Hashed<Object> = {
    id: '',
    object: data,
  };
  const router = await createApp();
  await request(router)
    .post('/uprtcl/1/data')
    .send({datas:[hashedData]})
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  return hashedData.id;
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
