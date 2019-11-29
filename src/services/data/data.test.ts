import { toBeValidCid } from "../../utils";
import { createData, getData } from "./support.data";

describe("routes", () => {
  expect.extend({ toBeValidCid });

  test("Create and read generic data", async () => {
    const data = {
      text: "my text",
      type: "paragraph",
      links: []
    };

    let dataId = await createData(data, "");
    let result = await getData(dataId, "");

    expect(result.object.text).toEqual(data.text);
    expect(result.object.type).toEqual(data.type);
    expect(result.object.links.length).toEqual(0);
  });
});
