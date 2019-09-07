import request from "supertest";

jest.mock("request-promise");
(promiseRequest as any).mockImplementation(() => '{"features": []}');

describe("routes", () => {

  test("creates a new context", async () => {
    const response = await request(app).post("/uprtcl/1/ctx")
    .send({
      creatorId: 'did:method:testX',
      timestamp: Date.now(),
      nonce: 0
    });
    expect(response.status).toEqual(200);
  });
});