import request from "supertest";
import promiseRequest from "request-promise";
import { router } from '../../server';
import CID from 'cids';
import { Context, Perspective } from "./types";

jest.mock("request-promise");
(promiseRequest as any).mockImplementation(() => '{"features": []}');

interface ExtendedMatchers extends jest.Matchers<void> {
  toBeValidCid: () => object;
}

describe("routes", () => {

  expect.extend({
    toBeValidCid(received) {
      if (CID.isCID(new CID(received))) {
        return {
          message: () => {return `expected ${received} not to be a valid cid`},
          pass: true
        };
      } else {
        return {
          message: () => {return `expected ${received} to be a valid cid`},
          pass: false
        };
      }
    }
  })

  test("CRUD contexts", async () => {
    const creatorId = 'did:method:12345';
    const nonce = 0;
    const timestamp = 1568027451547;

    const context: Context = {
      id: '',
      creatorId: creatorId,
      timestamp: timestamp,
      nonce: nonce
    }
    const post = await request(router).post('/uprtcl/1/ctx')
    .send(context);
    expect(post.status).toEqual(200);
    (expect(post.text) as unknown as ExtendedMatchers).toBeValidCid();

    let contextUid = post.text;

    const get = await request(router).get(`/uprtcl/1/ctx/${contextUid}`);
    expect(get.status).toEqual(200);
    
    let contextRead: Context = JSON.parse(get.text);
    
    expect(contextRead.id).toEqual(contextUid);
    expect(contextRead.creatorId).toEqual(creatorId);
    expect(contextRead.timestamp).toEqual(timestamp);
    expect(contextRead.nonce).toEqual(nonce);
  });

  test("CRUD perspectives", async () => {
    const creatorId = 'did:method:12345';
    const nonce = 0;
    const timestamp = 1568027451547;

    const perspective: Perspective = {
      contextId: 'wikipedia.barack_obama',
      origin: '',
      creatorId: creatorId,
      timestamp: timestamp
    }

    const post = await request(router).post('/uprtcl/1/persp')
    .send();
    expect(post.status).toEqual(200);
    (expect(post.text) as unknown as ExtendedMatchers).toBeValidCid();

    let contextUid = post.text;

    const get = await request(router).get(`/uprtcl/1/ctx/${contextUid}`);
    expect(get.status).toEqual(200);
    
    let contextRead: Context = JSON.parse(get.text);
    
    expect(contextRead.id).toEqual(contextUid);
    expect(contextRead.creatorId).toEqual(creatorId);
    expect(contextRead.timestamp).toEqual(timestamp);
    expect(contextRead.nonce).toEqual(nonce);
  });
  
});