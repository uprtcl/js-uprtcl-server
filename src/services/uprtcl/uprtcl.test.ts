import { toBeValidCid, ERROR, NOT_AUTHORIZED_MSG, SUCCESS } from '../../utils';
import {
  createPerspective,
  updatePerspective,
  getPerspectiveDetails,
  findPerspectives,
  deletePerspective,
  createCommitAndData,
  addPagesOrLinks,
  getEcosystem
} from './uprtcl.testsupport';
import { createUser } from '../user/user.testsupport';
import {
  addPermission,
  setPublicPermission,
} from '../access/access.testsupport';
import { PermissionType } from '../access/access.schema';

describe('routes', () => {
  expect.extend({ toBeValidCid });

  test('CRUD private perspectives', async () => {
    const creatorId = 'did:method:12345';
    const name = 'test';
    const context = 'wikipedia.barack_obama';

    const user1 = await createUser('seed1');
    const user2 = await createUser('seed2');

    const commit1Id = await createCommitAndData('text 123456', false, user1.jwt);
    const perspectiveId = await createPerspective(
      creatorId,
      846851,
      user1.jwt,
      commit1Id
    );

    const result1 = await getPerspectiveDetails(perspectiveId, user2.jwt);
    expect(result1.result).toEqual(ERROR);

    const result2 = await getPerspectiveDetails(perspectiveId, user1.jwt);

    expect(result2.data.headId).toEqual(commit1Id);

    /** set head */
    const commit2Id = await createCommitAndData('text 98765', false, user1.jwt);

    let result5 = await updatePerspective(
      perspectiveId,
      {
        headId: commit2Id,
        context: context,
        name: name,
      },
      user2.jwt
    );
    expect(result5.result).toEqual(ERROR);
    expect(result5.message).toEqual(NOT_AUTHORIZED_MSG);

    let result6 = await updatePerspective(
      perspectiveId,
      {
        headId: commit2Id,
        context: context,
        name: name,
      },
      user1.jwt
    );
    expect(result6.result).toEqual(SUCCESS);

    let result24 = await getPerspectiveDetails(perspectiveId, user2.jwt);
    expect(result24.data).toBeNull();
    expect(result24.result).toEqual(ERROR);
    expect(result24.message).toEqual(NOT_AUTHORIZED_MSG);

    let result25 = await getPerspectiveDetails(perspectiveId, '');
    expect(result25.data).toBeNull();
    expect(result25.result).toEqual(ERROR);
    expect(result25.message).toEqual(NOT_AUTHORIZED_MSG);

    let result26 = await getPerspectiveDetails(perspectiveId, user1.jwt);
    expect(result26.data.headId).toEqual(commit2Id);
    expect(result26.data.context).toEqual(context);
    expect(result26.data.name).toEqual(name);

    /** change read permisssion */
    let result27 = await getPerspectiveDetails(perspectiveId, user2.jwt);
    expect(result27.data).toBeNull();

    let result18 = await addPermission(
      perspectiveId,
      user2.userId,
      PermissionType.Read,
      user2.jwt
    );
    expect(result18.result).toEqual(ERROR);
    expect(result18.message).toEqual(NOT_AUTHORIZED_MSG);

    let result9 = await addPermission(
      perspectiveId,
      user2.userId,
      PermissionType.Read,
      user1.jwt
    );
    expect(result9.result).toEqual(SUCCESS);

    let result28 = await getPerspectiveDetails(perspectiveId, user2.jwt);
    expect(result28.data.headId).toEqual(commit2Id);

    /** update head */
    const commit3Id = await createCommitAndData('text 4745729', false, user1.jwt);

    let result7 = await updatePerspective(
      perspectiveId,
      { headId: commit3Id },
      user2.jwt
    );
    expect(result7.result).toEqual(ERROR);

    let result10 = await addPermission(
      perspectiveId,
      user2.userId,
      PermissionType.Write,
      user1.jwt
    );
    expect(result10.result).toEqual(SUCCESS);

    let result8 = await updatePerspective(
      perspectiveId,
      { headId: commit3Id },
      user2.jwt
    );
    expect(result8.result).toEqual(SUCCESS);

    let result29 = await getPerspectiveDetails(perspectiveId, user1.jwt);
    expect(result29.data.headId).toEqual(commit3Id);

    /** set public read */
    let user3 = await createUser('seed3');

    let result30 = await getPerspectiveDetails(perspectiveId, user3.jwt);
    expect(result30.data).toBeNull();

    let result11 = await setPublicPermission(
      perspectiveId,
      PermissionType.Read,
      true,
      user3.jwt
    );
    expect(result11.result).toEqual(ERROR);
    expect(result11.message).toEqual(NOT_AUTHORIZED_MSG);

    let result12 = await setPublicPermission(
      perspectiveId,
      PermissionType.Read,
      true,
      user1.jwt
    );
    expect(result12.result).toEqual(SUCCESS);

    let result31 = await getPerspectiveDetails(perspectiveId, user3.jwt);
    expect(result31.data.headId).toEqual(commit3Id);
    expect(result31.data.context).toEqual(context);
    expect(result31.data.name).toEqual(name);

    /** set public write */
    const commit4Id = await createCommitAndData('text 47ssas45729', false, user1.jwt);

    let result14 = await updatePerspective(
      perspectiveId,
      { headId: commit4Id },
      user3.jwt
    );
    expect(result14.result).toEqual(ERROR);
    expect(result14.message).toEqual(NOT_AUTHORIZED_MSG);

    let result16 = await setPublicPermission(
      perspectiveId,
      PermissionType.Write,
      true,
      user1.jwt
    );
    expect(result16.result).toEqual(SUCCESS);

    let result17 = await updatePerspective(
      perspectiveId,
      { headId: commit4Id },
      user3.jwt
    );
    expect(result17.result).toEqual(SUCCESS);

    let result32 = await getPerspectiveDetails(perspectiveId, '');
    expect(result32.data.headId).toEqual(commit4Id);

    /** update ecosystem */
    // Add links or pages to a perspective

      // Create perspective head with empty space      
      const commitIdBase = await createCommitAndData('base space', true, user1.jwt);
      const mainPerspective = await createPerspective(
        creatorId,
        556874,
        user1.jwt,
        commitIdBase
      );

      // Create page1 
      const page1Commit = await createCommitAndData('new page', false, user1.jwt);
      const page1Perspective = await createPerspective(
        creatorId,
        879456,
        user1.jwt,
        page1Commit
      );
      
      // Add parent Id to the new data head
      const newDataCommit1 = await addPagesOrLinks(
        [page1Perspective], 
        true, 
        [commitIdBase],
        user1.jwt
      );

      // Update perspective head with new data, linking new page.
      const updatedPerspective1 = await updatePerspective(
        mainPerspective,
        {
          headId: newDataCommit1,
          context: context,
          name: name
        },
        user1.jwt
      );      

      // Add one more page
      const page2Commit = await createCommitAndData('new page', false, user1.jwt);
      const page2Perspective = await createPerspective(
        creatorId,
        333548,
        user1.jwt,
        page2Commit
      );

      const newDataCommit2 = await addPagesOrLinks(
        [page1Perspective, page2Perspective], 
        true, 
        [newDataCommit1],
        user1.jwt
      );

      const updatedPerspective2 = await updatePerspective(
        mainPerspective,
        {
          headId: newDataCommit2,
          context: context,
          name: name
        },
        user1.jwt
      );      
      // ----- Finished adding the additional page. ------ //      

      // Add a link to page 1
      const link1Commit = await createCommitAndData('new link', false, user1.jwt);
      const link1Perspecitve = await createPerspective(
        creatorId,
        998745,
        user1.jwt,
        link1Commit
      );

      const newDataCommit3 = await addPagesOrLinks(
        [link1Perspecitve],
        false,
        [page1Commit],
        user1.jwt
      );

      const updatedPerspective3 = await updatePerspective(
        page1Perspective,
        {
          headId: newDataCommit3,
          context: context,
          name:name
        },
        user1.jwt
      );
      // ----- Finsihed adding an aditional link to page1 ------ //

      // Add 2 links to page 2
      const link2Commit = await createCommitAndData('new link', false, user1.jwt);
      const link2Perspective = await createPerspective(
        creatorId,
        132564,
        user1.jwt,
        link2Commit
      );

      const newDataCommit4 = await addPagesOrLinks(
        [link2Perspective],
        false,
        [page2Commit],
        user1.jwt
      );

      const updatedPerspective4 = await updatePerspective(
        page2Perspective,
        {
          headId: newDataCommit4,
          context: context,
          name: name
        },
        user1.jwt
      )

      const link3Commit = await createCommitAndData('new link', false, user1.jwt);
      const link3Perspective = await createPerspective(
        creatorId,
        884565,
        user1.jwt,
        link3Commit
      );

      const newDataCommit5 = await addPagesOrLinks(
        [link2Perspective, link3Perspective],
        false,
        [newDataCommit4],
        user1.jwt
      );

      const updatedPerspective5 = await updatePerspective(
        page2Perspective,
        {
          headId: newDataCommit5,
          context: context,
          name: name
        },
        user1.jwt
      );
      // ----- Finished adding 2 additional links to page 2 ---- //

      // Add another page to update main perspective
      const page3Commit = await createCommitAndData('new page', false, user1.jwt);
      const page3Perspective = await createPerspective(
        creatorId,
        445648,
        user1.jwt,
        page3Commit
      );
      
      // Add parent Id to the new data head
      const newDataCommit6 = await addPagesOrLinks(
        [page1Perspective, page2Perspective, page3Perspective], 
        true, 
        [newDataCommit2],
        user1.jwt
      );

      // Update perspective head with new data, linking new page.
      const updatedPerspective6 = await updatePerspective(
        mainPerspective,
        {
          headId: newDataCommit6,
          context: context,
          name: name
        },
        user1.jwt
      );      

      // Should point to itself
      const eco = await getEcosystem(mainPerspective);
      expect(eco[0]).toEqual(mainPerspective);

      // Should have all element IDs in the returning array
      expect(eco).toEqual([
        mainPerspective,
        page1Perspective,
        page2Perspective,
        link1Perspecitve,
        link2Perspective,
        link3Perspective,
        page3Perspective
      ]);

      // Should delete a famility if an intermediate parent node is deleted            
      const newDataCommit7 = await addPagesOrLinks(
        [page1Perspective, page3Perspective], 
        true, 
        [newDataCommit6],
        user1.jwt
      );
      
      const updatedPerspective7 = await updatePerspective(
        mainPerspective,
        {
          headId: newDataCommit7,
          context: context,
          name: name
        },
        user1.jwt
      );      

      const eco1 = await getEcosystem(mainPerspective);
      expect(eco1).toEqual([
        mainPerspective,
        page1Perspective,
        link1Perspecitve,
        page3Perspective
      ]);

    // /** remove public permissions */
    let result20 = await setPublicPermission(
      perspectiveId,
      PermissionType.Write,
      false,
      user2.jwt
    );
    expect(result20.result).toEqual(ERROR);
    expect(result20.message).toEqual(NOT_AUTHORIZED_MSG);

    let result23 = await setPublicPermission(
      perspectiveId,
      PermissionType.Write,
      false,
      user1.jwt
    );
    expect(result23.result).toEqual(SUCCESS);

    let result19 = await updatePerspective(
      perspectiveId,
      { headId: commit4Id },
      user3.jwt
    );
    expect(result19.result).toEqual(ERROR);
    expect(result19.message).toEqual(NOT_AUTHORIZED_MSG);

    let result22 = await setPublicPermission(
      perspectiveId,
      PermissionType.Read,
      false,
      user2.jwt
    );
    expect(result22.result).toEqual(ERROR);
    expect(result22.message).toEqual(NOT_AUTHORIZED_MSG);

    let result21 = await setPublicPermission(
      perspectiveId,
      PermissionType.Read,
      false,
      user1.jwt
    );
    expect(result21.result).toEqual(SUCCESS);

    let result33 = await getPerspectiveDetails(perspectiveId, '');
    expect(result33.data).toBeNull();

    /** delete perspective */
    let result41 = await deletePerspective(perspectiveId, user2.jwt);
    expect(result22.result).toEqual(ERROR);
    expect(result22.message).toEqual(NOT_AUTHORIZED_MSG);

    let result42 = await deletePerspective(perspectiveId, user1.jwt);
    expect(result42.result).toEqual(SUCCESS);

  });

  test('CRUD private perspective inherited', async (done) => {
    const creatorId = 'did:method:12345';

    let user1 = await createUser('seed3');
    let user2 = await createUser('seed4');

    const commit1Id = await createCommitAndData('text 1234cddc56', false, user1.jwt);
    let perspectiveId1 = await createPerspective(
      creatorId,
      542154,
      user1.jwt,
      commit1Id
    );

    const commit2Id = await createCommitAndData('text 1234cddc56', false, user1.jwt);
    let perspectiveId2 = await createPerspective(
      creatorId,
      789498,
      user1.jwt,
      commit2Id,
      perspectiveId1
    );

    let result1 = await getPerspectiveDetails(perspectiveId1, user2.jwt);
    expect(result1.result).toEqual(ERROR);

    let result2 = await getPerspectiveDetails(perspectiveId2, user2.jwt);
    expect(result2.result).toEqual(ERROR);

    let result3 = await getPerspectiveDetails(perspectiveId1, '');
    expect(result3.result).toEqual(ERROR);

    let result4 = await getPerspectiveDetails(perspectiveId2, '');
    expect(result4.result).toEqual(ERROR);

    let result5 = await getPerspectiveDetails(perspectiveId1, user1.jwt);
    expect(result5.data.headId).toEqual(commit1Id);

    let result6 = await getPerspectiveDetails(perspectiveId2, user1.jwt);
    expect(result6.data.headId).toEqual(commit2Id);

    done();
  });

  test('getContextPerspectives - private', async (done) => {
    const creatorId = 'did:method:12345';
    const context = 'context.test-2' + Math.floor(Math.random() * 10000000);

    let user1 = await createUser('seed1');
    let user2 = await createUser('seed2');

    const name1 = 'persp 1';
    const perspectiveId1 = await createPerspective(
      creatorId,
      Date.now(),
      user1.jwt
    );
    await updatePerspective(
      perspectiveId1,
      {
        context: context,
        name: name1,
      },
      user1.jwt
    );

    const name2 = 'persp 2';
    const perspectiveId2 = await createPerspective(
      creatorId,
      Date.now(),
      user1.jwt
    );
    await updatePerspective(
      perspectiveId2,
      {
        context: context,
        name: name2,
      },
      user1.jwt
    );

    const name3 = 'persp 3';
    const perspectiveId3 = await createPerspective(
      creatorId,
      Date.now(),
      user2.jwt
    );
    await updatePerspective(
      perspectiveId3,
      {
        context: context,
        name: name3,
      },
      user2.jwt
    );

    let result12 = await setPublicPermission(
      perspectiveId1,
      PermissionType.Read,
      true,
      user1.jwt
    );
    expect(result12.result).toEqual(SUCCESS);

    const result1 = await findPerspectives({ context }, '');
    expect(result1.data.length).toEqual(1);
    expect(result1.data).toContain(perspectiveId1);

    const result2 = await findPerspectives({ context }, user1.jwt);
    expect(result2.data.length).toEqual(2);
    expect(result2.data).toContain(perspectiveId1);
    expect(result2.data).toContain(perspectiveId2);

    const result3 = await findPerspectives({ context }, user2.jwt);
    expect(result3.data.length).toEqual(2);
    expect(result3.data).toContain(perspectiveId1);
    expect(result3.data).toContain(perspectiveId3);

    let result4 = await deletePerspective(perspectiveId1, user1.jwt);
    expect(result4.result).toEqual(SUCCESS);

    const result5 = await findPerspectives({ context }, user1.jwt);
    expect(result5.data.length).toEqual(1);
    expect(result5.data).toContain(perspectiveId2);

    done();
  });
});
