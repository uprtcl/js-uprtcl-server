import request from "supertest";
import { DocNodeType, DataDto, DataType } from "./types";
import { router } from "../../server";

export const createDocNode = async (text: string, doc_node_type: DocNodeType, links: string[], jwt: string):Promise<string> => {
  const data = {
    id: '',
    text: text,
    doc_node_type: doc_node_type,
    links: links
  }

  const dataDto: DataDto = {
    id: '',
    data: data,
    type: DataType.DOCUMENT_NODE
  }

  const post = await request(router).post('/uprtcl/1/data')
    .send(dataDto)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(post.status).toEqual(200);
  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

export const getData = async (dataId: string, jwt: string):Promise<any> => {
  const get = await request(router)
    .get(`/uprtcl/1/data/${dataId}`)
    .set('Authorization', jwt ? `Bearer ${jwt}` : '');

  expect(get.status).toEqual(200);

  let dataWrapper = JSON.parse(get.text).data;
  let data = JSON.parse(dataWrapper.jsonData);
  data.id = dataWrapper.id

  return data;
}