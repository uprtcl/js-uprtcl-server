
import { toBeValidCid, ERROR, NOT_AUTHORIZED_MSG, SUCCESS } from "../../utils";
import { createPerspective, getPerspective, createCommit, updatePerspective, getPerspectiveDetails } from "./uprtcl.testsupport";
import { createDocNode } from "../data/support.data";
import { DocNodeType } from "../data/types";
import { LOCAL_EVEES_PROVIDER } from "../knownsources/knownsources.repository";
import { createUser } from "../user/user.testsupport";
import { Perspective, Commit } from "./types";
import { delegatePermissionsTo, addPermission, setPublicPermission } from "../access/access.testsupport";
import { PermissionType } from "../access/access.schema";

describe("routes", () => {

  expect.extend({toBeValidCid})

  test("CRUD public owner-less perspectives", async () => {
    
    const creatorId = 'did:method:12345';
    const name = 'test';
    const context = 'wikipedia.barack_obama';
    const timestamp = 1568027451547;

    let perspectiveId = await createPerspective(creatorId, timestamp, '');
    let result1 = await getPerspective(perspectiveId, '');
    
    expect(result1.data.id).toEqual(perspectiveId);
    expect(result1.data.object.payload.creatorId).toEqual(creatorId);
    expect(result1.data.object.payload.timestamp).toEqual(timestamp);
    expect(result1.data.object.payload.origin).toEqual(LOCAL_EVEES_PROVIDER);

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

    let result2 = await getPerspectiveDetails(perspectiveId, '');

    expect(result2.data.headId).toEqual(commit1Id);
    expect(result2.data.context).toEqual(context);
    expect(result2.data.name).toEqual(name);

    let text2 = 'new content 2';
    let par2Id = await createDocNode(text2, DocNodeType.paragraph, [], '');
    let commit2Id = await createCommit([creatorId], timestamp, message, [commit1Id], par2Id, '');

    await updatePerspective(perspectiveId, { 
      headId: commit2Id
    }, '');

    let result3 = await getPerspectiveDetails(perspectiveId, '');

    expect(result3.data.headId).toEqual(commit2Id);
    expect(result3.data.context).toEqual(context);
    expect(result3.data.name).toEqual(name);
  });

  test.skip("CRUD private perspectives", async () => {
    const creatorId = 'did:method:12345';
    const name = 'test';
    const context = 'wikipedia.barack_obama';
    const timestamp = 1568027451548;

    let user1 = await createUser('seed1');
    let user2 = await createUser('seed2');
   
    let perspectiveId = await createPerspective(creatorId, timestamp, user1.jwt);
    
    let result1 = await getPerspective(perspectiveId, user2.jwt);
    expect(result1.result).toEqual(ERROR);
    expect(result1.message).toEqual(NOT_AUTHORIZED_MSG);

    let result2 = await getPerspective(perspectiveId, user1.jwt);

    expect(result2.data.id).toEqual(perspectiveId);
    expect(result2.data.object.payload.creatorId).toEqual(creatorId);
    expect(result2.data.object.payload.timestamp).toEqual(timestamp);
    expect(result2.data.object.payload.origin).toEqual(LOCAL_EVEES_PROVIDER);

    /** set head */
    const message = 'commit message';
    
    let text1 = 'new content';
    let par1Id = await createDocNode(text1, DocNodeType.paragraph, [], user1.jwt); 
    let commit1Id = await createCommit([creatorId], timestamp, message, [], par1Id, user1.jwt);
  
    let result5 = await updatePerspective(perspectiveId, {
      headId: commit1Id,
      context: context,
      name: name 
    }, user2.jwt);
    expect(result5.result).toEqual(ERROR);
    expect(result5.message).toEqual(NOT_AUTHORIZED_MSG);

    let result6 = await updatePerspective(perspectiveId, {
      headId: commit1Id,
      context: context,
      name: name 
    }, user1.jwt);
    expect(result6.result).toEqual(SUCCESS);

    let result24 = await getPerspectiveDetails(perspectiveId, user2.jwt);
    expect(result24.data).toBeNull();

    let result25 = await getPerspectiveDetails(perspectiveId, '');
    expect(result25.data).toBeNull();

    let result26 = await getPerspectiveDetails(perspectiveId, user1.jwt);
    expect(result26.data.headId).toEqual(commit1Id);
    expect(result26.data.context).toEqual(context);
    expect(result26.data.name).toEqual(name);

    /** change read permisssion */
    let result27 = await getPerspectiveDetails(perspectiveId, user2.jwt);
    expect(result27.data).toBeNull();

    let result18 = await addPermission(perspectiveId, user2.userId, PermissionType.Read, user2.jwt);
    expect(result18.result).toEqual(ERROR);
    expect(result18.message).toEqual(NOT_AUTHORIZED_MSG);

    let result9 = await addPermission(perspectiveId, user2.userId, PermissionType.Read, user1.jwt);
    expect(result9.result).toEqual(SUCCESS);
    
    let result28 = await getPerspectiveDetails(perspectiveId, user2.jwt);
    expect(result28.data.headId).toEqual(commit1Id);

    /** update head */
    let text2 = 'new content 2';
    let par2Id = await createDocNode(text2, DocNodeType.paragraph, [], user1.jwt); 
    let commit2Id = await createCommit([creatorId], timestamp, message, [commit1Id], par2Id, user1.jwt);
    
    let result7 = await updatePerspective(perspectiveId, { headId: commit2Id }, user2.jwt);
    expect(result7.result).toEqual(ERROR);

    let result10 = await addPermission(perspectiveId, user2.userId, PermissionType.Write, user1.jwt);
    expect(result10.result).toEqual(SUCCESS)

    let result8 = await updatePerspective(perspectiveId, { headId: commit2Id }, user2.jwt);
    expect(result8.result).toEqual(SUCCESS);

    let result29 = await getPerspectiveDetails(perspectiveId, user1.jwt);
    expect(result29.data.headId).toEqual(commit2Id);

    /** set public read */
    let user3 = await createUser('seed2');

    let result30 = await getPerspectiveDetails(perspectiveId, user3.jwt);
    expect(result30.data).toBeNull();

    let result11 = await setPublicPermission(perspectiveId, PermissionType.Read, true, user3.jwt);
    expect(result11.result).toEqual(ERROR);
    expect(result11.message).toEqual(NOT_AUTHORIZED_MSG);

    let result12 = await setPublicPermission(perspectiveId, PermissionType.Read, true, user1.jwt);
    expect(result12.result).toEqual(SUCCESS);
    
    let result31 = await getPerspectiveDetails(perspectiveId, user3.jwt);
    expect(result31.data.headId).toEqual(commit2Id);
    expect(result31.data.context).toEqual(context);
    expect(result31.data.name).toEqual(name);

    /** set public write */
    let text3 = 'new content 3';
    let par3Id = await createDocNode(text3, DocNodeType.paragraph, [], user1.jwt); 
    let commit3Id = await createCommit([creatorId], timestamp, message, [commit2Id], par3Id, user1.jwt);

    let result14 = await updatePerspective(perspectiveId, { headId: commit3Id }, user3.jwt);
    expect(result14.result).toEqual(ERROR);
    expect(result14.message).toEqual(NOT_AUTHORIZED_MSG);

    let result16 = await setPublicPermission(perspectiveId, PermissionType.Write, true, user1.jwt);
    expect(result16.result).toEqual(SUCCESS);

    let result17 = await updatePerspective(perspectiveId, { headId: commit3Id }, user3.jwt);
    expect(result17.result).toEqual(SUCCESS);

    let result32 = await getPerspectiveDetails(perspectiveId, '');
    expect(result32.data.headId).toEqual(commit3Id);
    
    /** remove public permissions */
    let result20 = await setPublicPermission(perspectiveId, PermissionType.Write, false, user2.jwt);
    expect(result20.result).toEqual(ERROR);
    expect(result20.message).toEqual(NOT_AUTHORIZED_MSG);

    let result23 = await setPublicPermission(perspectiveId, PermissionType.Write, false, user1.jwt);
    expect(result23.result).toEqual(SUCCESS);

    let result19 = await updatePerspective(perspectiveId, { headId: commit3Id }, user3.jwt);
    expect(result19.result).toEqual(ERROR);
    expect(result19.message).toEqual(NOT_AUTHORIZED_MSG);

    let result22 = await setPublicPermission(perspectiveId, PermissionType.Read, false, user2.jwt);
    expect(result22.result).toEqual(ERROR);
    expect(result22.message).toEqual(NOT_AUTHORIZED_MSG);

    let result21 = await setPublicPermission(perspectiveId, PermissionType.Read, false, user1.jwt);
    expect(result21.result).toEqual(SUCCESS);

    let result33 = await getPerspectiveDetails(perspectiveId, '');
    expect(result33.data).toBeNull()

  });
});