import request from "supertest";
import promiseRequest from "request-promise";
import { router } from '../../server';

jest.mock("request-promise");
(promiseRequest as any).mockImplementation(() => '{"features": []}');

describe("routes", () => {
  test("creates a new context", async () => {
    const response = await request(router).post("/uprtcl/1/ctx")
    .send({
      creatorId: 'did:method:testX',
      timestamp: Date.now(),
      nonce: 0
    });
    expect(response.status).toEqual(200);
    expect(response.text).toEqual(expect.stringMatching('^0x'));
  });
});