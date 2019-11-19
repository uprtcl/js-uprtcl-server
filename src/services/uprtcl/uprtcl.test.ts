
import promiseRequest from "request-promise";

import { toBeValidCid } from "../../utils";
import { createPerspective, getPerspective, createCommit, updatePerspective, getPerspectiveDetails } from "./uprtcl.testsupport";
import { createDocNode } from "../data/support.data";
import { DocNodeType } from "../data/types";

jest.mock("request-promise");
(promiseRequest as any).mockImplementation(() => '{"features": []}');

describe("routes", () => {

  expect.extend({toBeValidCid})

  test("CRUD public owner-less perspectives", async () => {
    
    const creatorId = 'did:method:12345';
    const name = 'test';
    const context = 'wikipedia.barack_obama';
    const timestamp = 1568027451547;

    let perspectiveId = await createPerspective(creatorId, timestamp, '');
    let perspectiveRead = await getPerspective(perspectiveId, '');
    
    const origin = 'https://www.collectiveone.org/uprtcl/1';

    expect(perspectiveRead.id).toEqual(perspectiveId);
    expect(perspectiveRead.object.payload.creatorId).toEqual(creatorId);
    expect(perspectiveRead.object.payload.timestamp).toEqual(timestamp);
    expect(perspectiveRead.object.payload.origin).toEqual(origin);

    /** update head */
    const message = 'commit message';
    
    let text1 = 'new content';
    let par1Id = await createDocNode(text1, DocNodeType.paragraph, [], ''); 
    let commit1Id = await createCommit([creatorId], timestamp, message, [], par1Id, '');

    await updatePerspective(perspectiveId, { 
      headId: commit1Id,
      context: context,
      name: name
    }, '');

    let perspectiveDetailsRead = await getPerspectiveDetails(perspectiveId, '');

    expect(perspectiveDetailsRead.headId).toEqual(commit1Id);
    expect(perspectiveDetailsRead.context).toEqual(context);
    expect(perspectiveDetailsRead.name).toEqual(name);

    let text2 = 'new content 2';
    let par2Id = await createDocNode(text1, DocNodeType.paragraph, [], '');
    let commit2Id = await createCommit([creatorId], timestamp, message, [], par2Id, '');

    await updatePerspective(perspectiveId, { 
      headId: commit2Id
    }, '');

    let perspectiveDetailsRead2 = await getPerspectiveDetails(perspectiveId, '');

    expect(perspectiveDetailsRead2.headId).toEqual(commit2Id);
    expect(perspectiveDetailsRead2.context).toEqual(context);
    expect(perspectiveDetailsRead2.name).toEqual(name);

  });
});