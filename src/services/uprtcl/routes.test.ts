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

  test("CRUD perspectives", async () => {
    const creatorId = 'did:method:12345';
    const timestamp = 1568027451547;
    const name = 'test';
    const context = 'wikipedia.barack_obama';

    const perspective: Perspective = {
      id: '',
      name: name,
      context: context,
      origin: '',
      creatorId: creatorId,
      timestamp: timestamp
    }

    const post = await request(router).post('/uprtcl/1/persp')
    .send(perspective);
    expect(post.status).toEqual(200);
    (expect(post.text) as unknown as ExtendedMatchers).toBeValidCid();

    let perspectiveId = post.text;

    const get = await request(router).get(`/uprtcl/1/persp/${perspectiveId}`);
    expect(get.status).toEqual(200);
    
    let perspectiveRead: Perspective = JSON.parse(get.text);
    
    const origin = 'http://collectiveone.org/uprtcl/1';

    expect(perspectiveRead.id).toEqual(perspectiveId);
    expect(perspectiveRead.creatorId).toEqual(creatorId);
    expect(perspectiveRead.timestamp).toEqual(timestamp);
    expect(perspectiveRead.name).toEqual(name);
    expect(perspectiveRead.context).toEqual(context);
    expect(perspectiveRead.origin).toEqual(origin);
  });
  
});