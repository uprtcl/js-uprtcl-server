
import promiseRequest from "request-promise";

var CID  = require('cids');
import { ERROR, SUCCESS, NOT_AUTHORIZED_MSG } from "./uprtcl.controller";
import { AccessConfig } from "../access/access.repository";
import { Perspective, PostResult, Commit } from "./types";
import { DataDto, DataType, DocNodeType } from "../data/types";
import { PermissionType } from "../access/access.schema";

jest.mock("request-promise");
(promiseRequest as any).mockImplementation(() => '{"features": []}');


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

  test.skip("CRUD public owner-less perspectives", async () => {
    const creatorId = 'did:method:12345';
    const name = 'test';
    const context = 'wikipedia.barack_obama';
    const timestamp = 1568027451547;

    let perspectiveId = await createPerspective(creatorId, name, context, timestamp, '');
    let perspectiveRead = await getPerspective(perspectiveId, '');
    
    const origin = 'https://www.collectiveone.org/uprtcl/1';

    expect(perspectiveRead.id).toEqual(perspectiveId);
    expect(perspectiveRead.creatorId).toEqual(creatorId);
    expect(perspectiveRead.timestamp).toEqual(timestamp);
    expect(perspectiveRead.name).toEqual(name);
    expect(perspectiveRead.context).toEqual(context);
    expect(perspectiveRead.origin).toEqual(origin);

    /** update head */
    const message = 'commit message';
    
    let text1 = 'new content';
    let par1Id = await createText(text1, ''); 
    let commit1Id = await createCommit(creatorId, timestamp, message, [], par1Id, '');

    await updatePerspective(perspectiveId, commit1Id, '');
    let perspectiveHeadRead = await getPerspectiveHead(perspectiveId, '');

    expect(perspectiveHeadRead).toEqual(commit1Id);

    let text2 = 'new content 2';
    let par2Id = await createText(text2, ''); 
    let commit2Id = await createCommit(creatorId, timestamp, message, [], par2Id, '');

    await updatePerspective(perspectiveId, commit2Id, '');
    let perspectiveHeadRead2 = await getPerspectiveHead(perspectiveId, '');

    expect(perspectiveHeadRead2).toEqual(commit2Id);
  });

  test("generic getters", async () => {
    const creatorId = 'did:method:12345';
    const name = 'test';
    const context = 'wikipedia.barack_obama';
    const timestamp = 1568027451548;

    const user1 = await createUser('seed001');
    
    const perspectiveId = await createPerspective(creatorId, name, context, timestamp, user1.jwt);
    const perspectiveRead01 = await getGeneric<Perspective>(perspectiveId, user1.jwt);

    const origin = 'https://www.collectiveone.org/uprtcl/1';

    expect(perspectiveRead01.id).toEqual(perspectiveId);
    expect(perspectiveRead01.creatorId).toEqual(creatorId);
    expect(perspectiveRead01.timestamp).toEqual(timestamp);
    expect(perspectiveRead01.name).toEqual(name);
    expect(perspectiveRead01.context).toEqual(context);
    expect(perspectiveRead01.origin).toEqual(origin);
    
    const text1 = 'new content';
    const par1Id = await createText(text1, user1.jwt); 
    const dataRead = await getGeneric<any>(par1Id, user1.jwt);

    expect(dataRead.id).toEqual(par1Id);
    expect(dataRead.text).toEqual(text1);

    const message = 'commit message';
    const commit1Id = await createCommit(creatorId, timestamp, message, [], par1Id, user1.jwt);
    const commitRead = await getGeneric<Commit>(commit1Id, user1.jwt);

    expect(commitRead.id).toEqual(commit1Id);
    expect(commitRead.creatorId).toEqual(creatorId);
    expect(commitRead.timestamp).toEqual(timestamp);
    expect(commitRead.message).toEqual(message);
    expect(commitRead.dataId).toEqual(par1Id);
    expect(commitRead.parentsIds.length).toEqual(0);

    
    
  });

  test.skip("CRUD private perspectives", async () => {
    const creatorId = 'did:method:12345';
    const name = 'test';
    const context = 'wikipedia.barack_obama';
    const timestamp = 1568027451548;

    let user1 = await createUser('seed1');
    let user2 = await createUser('seed2');
   
    let perspectiveId = await createPerspective(creatorId, name, context, timestamp, user1.jwt);

    /** test generic get */
    let perspectiveRead01 = await getGeneric<Perspective>(perspectiveId, user1.jwt);

    const origin = 'https://www.collectiveone.org/uprtcl/1';

    expect(perspectiveRead01.id).toEqual(perspectiveId);
    expect(perspectiveRead01.creatorId).toEqual(creatorId);
    expect(perspectiveRead01.timestamp).toEqual(timestamp);
    expect(perspectiveRead01.name).toEqual(name);
    expect(perspectiveRead01.context).toEqual(context);
    expect(perspectiveRead01.origin).toEqual(origin);

    let perspectiveRead1 = await getPerspective(perspectiveId, user2.jwt);
    
    expect(perspectiveRead1).toBeNull();

    let perspectiveRead = await getPerspective(perspectiveId, user1.jwt);
    
    expect(perspectiveRead.id).toEqual(perspectiveId);
    expect(perspectiveRead.creatorId).toEqual(creatorId);
    expect(perspectiveRead.timestamp).toEqual(timestamp);
    expect(perspectiveRead.name).toEqual(name);
    expect(perspectiveRead.context).toEqual(context);
    expect(perspectiveRead.origin).toEqual(origin);

    /** set head */
    const message = 'commit message';
    
    let text1 = 'new content';
    let par1Id = await createText(text1, user1.jwt); 
    let commit1Id = await createCommit(creatorId, timestamp, message, [], par1Id, user1.jwt);
    
    let result1 = await delegatePermissionsTo(commit1Id, perspectiveId, user2.jwt);
    expect(result1.result).toEqual(ERROR);
    expect(result1.message).toEqual(NOT_AUTHORIZED_MSG);

    let result2 = await delegatePermissionsTo(commit1Id, perspectiveId, user1.jwt);
    expect(result2.result).toEqual(SUCCESS);

    let result3 = await updatePerspective(perspectiveId, commit1Id, user2.jwt);
    expect(result3.result).toEqual(ERROR);
    expect(result3.message).toEqual(NOT_AUTHORIZED_MSG);

    let result4 = await updatePerspective(perspectiveId, commit1Id, user1.jwt);
    expect(result4.result).toEqual(SUCCESS);

    let perspectiveHeadReadx = await getPerspectiveHead(perspectiveId, user2.jwt);
    expect(perspectiveHeadReadx).toBeNull();

    let perspectiveHeadReadxx = await getPerspectiveHead(perspectiveId, '');
    expect(perspectiveHeadReadxx).toBeNull();

    let perspectiveHeadRead = await getPerspectiveHead(perspectiveId, user1.jwt);
    expect(perspectiveHeadRead).toEqual(commit1Id);

    /** change read permisssion */
    let perspectiveHeadRead2x = await getPerspectiveHead(perspectiveId, user2.jwt);
    expect(perspectiveHeadRead2x).toBeNull();

    let result8 = await addPermission(perspectiveId, user2.userId, PermissionType.Read, user2.jwt);
    expect(result8.result).toEqual(ERROR);
    expect(result8.message).toEqual(NOT_AUTHORIZED_MSG);

    let result9 = await addPermission(perspectiveId, user2.userId, PermissionType.Read, user1.jwt);
    expect(result9.result).toEqual(SUCCESS);
    
    let perspectiveHeadRead2o = await getPerspectiveHead(perspectiveId, user2.jwt);
    expect(perspectiveHeadRead2o).toEqual(commit1Id);

    /** update head */
    let text2 = 'new content 2';
    let par2Id = await createText(text2, user1.jwt); 
    let commit2Id = await createCommit(creatorId, timestamp, message, [], par2Id, user1.jwt);
    let result13 = await delegatePermissionsTo(commit2Id, perspectiveId, user1.jwt);
    expect(result13.result).toEqual(SUCCESS);

    let result5 = await updatePerspective(perspectiveId, commit2Id, user2.jwt);
    expect(result5.result).toEqual(ERROR);

    let result10 = await addPermission(perspectiveId, user2.userId, PermissionType.Write, user1.jwt);
    expect(result10.result).toEqual(SUCCESS)

    let result6 = await updatePerspective(perspectiveId, commit2Id, user2.jwt);
    expect(result6.result).toEqual(SUCCESS);

    let perspectiveHeadRead2 = await getPerspectiveHead(perspectiveId, user1.jwt);
    
    expect(perspectiveHeadRead2).toEqual(commit2Id);

    /** set public read */
    let user3 = await createUser('seed2');

    let perspectiveHeadRead3 = await getPerspectiveHead(perspectiveId, user3.jwt);
    expect(perspectiveHeadRead3).toBeNull();

    let result11 = await setPublicPermission(perspectiveId, PermissionType.Read, true, user3.jwt);
    expect(result11.result).toEqual(ERROR);
    expect(result11.message).toEqual(NOT_AUTHORIZED_MSG);

    let result12 = await setPublicPermission(perspectiveId, PermissionType.Read, true, user1.jwt);
    expect(result12.result).toEqual(SUCCESS);
    
    let perspectiveHeadRead3o = await getPerspectiveHead(perspectiveId, user3.jwt);
    expect(perspectiveHeadRead3o).toEqual(commit2Id);

    /** set public write */

    let text3 = 'new content 3';
    let par3Id = await createText(text3, user1.jwt); 
    let commit3Id = await createCommit(creatorId, timestamp, message, [], par3Id, user1.jwt);
    let result15 = await delegatePermissionsTo(commit3Id, perspectiveId, user1.jwt);
    expect(result15.result).toEqual(SUCCESS);

    let result14 = await updatePerspective(perspectiveId, commit3Id, user3.jwt);
    expect(result14.result).toEqual(ERROR);
    expect(result14.message).toEqual(NOT_AUTHORIZED_MSG);

    let result16 = await setPublicPermission(perspectiveId, PermissionType.Write, true, user1.jwt);
    expect(result16.result).toEqual(SUCCESS);

    let result17 = await updatePerspective(perspectiveId, commit3Id, user3.jwt);
    expect(result17.result).toEqual(SUCCESS);

    let perspectiveHeadRead3oo = await getPerspectiveHead(perspectiveId, '');
    expect(perspectiveHeadRead3oo).toEqual(commit3Id);
    
    /** remove public permissions */
    let result20 = await setPublicPermission(perspectiveId, PermissionType.Write, false, user2.jwt);
    expect(result20.result).toEqual(ERROR);
    expect(result20.message).toEqual(NOT_AUTHORIZED_MSG);

    let result18 = await setPublicPermission(perspectiveId, PermissionType.Write, false, user1.jwt);
    expect(result18.result).toEqual(SUCCESS);

    let result19 = await updatePerspective(perspectiveId, commit3Id, user3.jwt);
    expect(result19.result).toEqual(ERROR);
    expect(result19.message).toEqual(NOT_AUTHORIZED_MSG);

    let result22 = await setPublicPermission(perspectiveId, PermissionType.Read, false, user2.jwt);
    expect(result22.result).toEqual(ERROR);
    expect(result22.message).toEqual(NOT_AUTHORIZED_MSG);

    let result21 = await setPublicPermission(perspectiveId, PermissionType.Read, false, user1.jwt);
    expect(result21.result).toEqual(SUCCESS);

    let perspectiveHeadRead3oox = await getPerspectiveHead(perspectiveId, '');
    expect(perspectiveHeadRead3oox).toBeNull()

  });

  test.skip("CRUD text data", async () => {
    let text = 'an example text';

    let dataId = await createText(text, '');
    let dataRead = await getData(dataId, '')

    console.log(dataRead)
    
    expect(dataRead.id).toEqual(dataId);
    expect(dataRead.text).toEqual(text);
  });

  test.skip("CRUD text node data", async () => {
    let text1 = 'a paragraph 1';
    let par1Id = await createText(text1, '');

    let text2 = 'a paragraph 2';
    let par2Id = await createText(text2, '');

    let text12 = 'a paragraph 1.2';
    let par12Id = await createText(text12, '');

    let subtitle1 = 'a subtitle 2';
    let sub1Id = await createTextNode(subtitle1, [par12Id], '');

    let text3 = 'a title';
    let dataId = await createTextNode(text3, [par1Id, par2Id, sub1Id], '');

    let dataRead = await getData(dataId, '')
    
    expect(dataRead.id).toEqual(dataId);
    expect(dataRead.text).toEqual(text3);
    expect(dataRead.links.length).toEqual(3);
    
    expect(dataRead.links[0]).toEqual(par1Id);
    expect(dataRead.links[1]).toEqual(par2Id);
    expect(dataRead.links[2]).toEqual(sub1Id);
  });

  test.skip("CRUD doc node data", async () => {

    let par1 = 'a doc parragraph 1';
    let par1Id = await createDocNode(par1, DocNodeType.paragraph, [], '');

    let par2 = 'a doc parragraph 2';
    let par2Id = await createDocNode(par2, DocNodeType.paragraph, [], '');

    let title1 = 'a doc title';
    let title1Id = await createDocNode(title1, DocNodeType.title, [par1Id, par2Id], '');

    let dataRead = await getData(title1Id, '')
    
    expect(dataRead.id).toEqual(title1Id);
    expect(dataRead.text).toEqual(title1);
    expect(dataRead.doc_node_type).toEqual(DocNodeType.title);

    expect(dataRead.links.length).toEqual(2);
    
    expect(dataRead.links[0]).toEqual(par1Id);
    expect(dataRead.links[1]).toEqual(par2Id);
  });

  test.skip("CRUD commits", async () => {
    const creatorId = 'did:method:12345';
    const message = 'commit message';
    const timestamp = 1568027451547;

    let text1 = 'a paragraph 1';
    let par1Id = await createText(text1, ''); 

    let commit1Id = await createCommit(creatorId, timestamp, message, [], par1Id, '');
    let commitRead = await getCommit(commit1Id, '');
    
    expect(commitRead.id).toEqual(commit1Id);
    expect(commitRead.creatorId).toEqual(creatorId);
    expect(commitRead.timestamp).toEqual(timestamp);
    expect(commitRead.message).toEqual(message);
    expect(commitRead.dataId).toEqual(par1Id);
    expect(commitRead.parentsIds.length).toEqual(0);

    let par11Id = await createText('a paragraph 1 updated', '');
    
    let message2 = 'udpated text';

    let commit11Id = await createCommit(creatorId, timestamp, message2, [commit1Id], par11Id, '');
    let commit11Read = await getCommit(commit11Id, '');

    expect(commit11Read.id).toEqual(commit11Id);
    expect(commit11Read.creatorId).toEqual(creatorId);
    expect(commit11Read.timestamp).toEqual(timestamp);
    expect(commit11Read.message).toEqual(message2);
    expect(commit11Read.dataId).toEqual(par11Id);
    expect(commit11Read.parentsIds.length).toEqual(1);
    expect(commit11Read.parentsIds[0]).toEqual(commit1Id);

  });

  test.skip("Discovery", async () => {
    let par1Id = await createText('a paragraph 1', '');

    const origin = 'https://www.collectiveone.org/uprtcl/1';

    let source1 = 'eth://12345';
    let source2 = 'holochain://456789';
    let source3 = origin;
    
    await addKnownSources(par1Id, [source1, source2, source3]);

    let sourcesRead = await getKnownSources(par1Id);

    expect(sourcesRead.length).toEqual(3);
    expect(sourcesRead[0]).toEqual(source1);
    expect(sourcesRead[1]).toEqual(source2);
    expect(sourcesRead[2]).toEqual(source3);

    let par2Id = await createText('a paragraph 2', '');
    
    let sourcesRead2 = await getKnownSources(par2Id);
    expect(sourcesRead2.length).toEqual(1);
    expect(sourcesRead2[0]).toEqual(origin);
  });
  
});