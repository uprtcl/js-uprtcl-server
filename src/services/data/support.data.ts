import request from "supertest";
import { router } from "../../server";
import { ExtendedMatchers } from "../../utils";
import { Hashed } from "../uprtcl/types";

export const createData = async (
  data: Object,
  jwt: string
): Promise<string> => {
  const hashedData: Hashed<Object> = {
    id: "",
    object: data
  };

  const post = await request(router)
    .post("/uprtcl/1/data")
    .send(hashedData)
    .set("Authorization", jwt ? `Bearer ${jwt}` : "");

  expect(post.status).toEqual(200);
  let result: any = JSON.parse(post.text).elementIds[0];
  ((expect(result) as unknown) as ExtendedMatchers).toBeValidCid();

  return result;
};

export const getData = async (
  dataId: string,
  jwt: string
): Promise<Hashed<any>> => {
  const get = await request(router)
    .get(`/uprtcl/1/data/${dataId}`)
    .set("Authorization", jwt ? `Bearer ${jwt}` : "");

  expect(get.status).toEqual(200);
  return JSON.parse(get.text).data;
};
