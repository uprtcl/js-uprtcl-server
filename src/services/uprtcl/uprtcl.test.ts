import { toBeValidCid, ERROR, NOT_AUTHORIZED_MSG, SUCCESS } from '../../utils';
import {
  createPerspective,
  updatePerspective,
  getPerspectiveDetails,
  findPerspectives,
  deletePerspective,
  createCommitAndData,
  addPagesOrLinks,
  getPerspectiveRelatives,
  getIndependentPerspectives,
  createAndInitPerspective,
  forkPerspective,
  addChildToPerspective,
} from './uprtcl.testsupport';
import { createUser } from '../user/user.testsupport';
import {
  addPermission,
  setPublicPermission,
} from '../access/access.testsupport';
import { PermissionType } from '../uprtcl/types';

describe('routes', () => {
  expect.extend({ toBeValidCid });

  test('CRUD private perspectives', async (done) => {
    const name = 'test';
    const context = 'wikipedia.barack_obama';

    const user1 = await createUser('seed1');
    const user2 = await createUser('seed2');

    const commit1Id = await createCommitAndData(
      'text 123456',
      false,
      user1
    );
    const perspectiveId = await createPerspective(
      user1,
      Date.now(),
      context,
      commit1Id
    );

    const result1 = await getPerspectiveDetails(perspectiveId, user2.jwt);
    expect(result1.result).toEqual(ERROR);

    const result2 = await getPerspectiveDetails(perspectiveId, user1.jwt);

    expect(result2.data.headId).toEqual(commit1Id);

    /** set head */
    const commit2Id = await createCommitAndData('text 98765', false, user1);

    let result5 = await updatePerspective(
      perspectiveId,
      {
        headId: commit2Id,
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
    const commit3Id = await createCommitAndData(
      'text 4745729',
      false,
      user1
    );

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
    expect(result31.data.name).toEqual(name);

    /** set public write */
    const commit4Id = await createCommitAndData(
      'text 47ssas45729',
      false,
      user1
    );

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

    /** remove public permissions */
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
    done();
  });

  test('CRUD private perspective inherited', async (done) => {

    let user1 = await createUser('seed3');
    let user2 = await createUser('seed4');

    const context = 'wikipedia.barack_obama';

    const commit1Id = await createCommitAndData(
      'text 1234cddc56',
      false,
      user1
    );
    let perspectiveId1 = await createPerspective(
      user1,
      Date.now(),
      context,
      commit1Id
    );

    const commit2Id = await createCommitAndData(
      'text 1234cddc56',
      false,
      user1
    );
    let perspectiveId2 = await createPerspective(
      user1,
      Date.now(),
      context,
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
    const context = 'context.test-2' + Math.floor(Math.random() * 10000000);

    let user1 = await createUser('seed1');
    let user2 = await createUser('seed2');

    const name1 = 'persp 1';
    const perspectiveId1 = await createPerspective(
      user1,
      Date.now(),
      context
    );
    await updatePerspective(
      perspectiveId1,
      {
        name: name1,
      },
      user1.jwt
    );

    const name2 = 'persp 2';
    const perspectiveId2 = await createPerspective(
      user1,
      Date.now(),
      context
    );
    await updatePerspective(
      perspectiveId2,
      {
        name: name2,
      },
      user1.jwt
    );

    const name3 = 'persp 3';
    const perspectiveId3 = await createPerspective(
      user1,
      Date.now(),
      context
    );
    await updatePerspective(
      perspectiveId3,
      {
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

  test('update ecosystem', async (done) => {
    const name = 'test';
    const context = 'wikipedia.barack_obama';

    const user1 = await createUser('seed1');
    /** update ecosystem */
    // Add links or pages to a perspective

    // Create perspective head with empty space
    const commitIdBase = await createCommitAndData(
      'base space',
      true,
      user1
    );
    const mainPerspective = await createPerspective(
      user1,
      556874,
      context,
      commitIdBase
    );

    // Create page1
    const page1Commit = await createCommitAndData('new page', false, user1);
    const page1Perspective = await createPerspective(
      user1,
      879456,
      context,
      page1Commit
    );

    // Add parent Id to the new data head
    const newDataCommit1 = await addPagesOrLinks(
      [page1Perspective],
      true,
      [commitIdBase],
      user1
    );

    // Update perspective head with new data, linking new page.
    const updatedPerspective1 = await updatePerspective(
      mainPerspective,
      {
        headId: newDataCommit1,
        name: name,
      },
      user1.jwt
    );

    // Add one more page
    const page2Commit = await createCommitAndData('new page', false, user1);
    const page2Perspective = await createPerspective(
      user1,
      333548,
      context,
      page2Commit
    );

    const newDataCommit2 = await addPagesOrLinks(
      [page1Perspective, page2Perspective],
      true,
      [newDataCommit1],
      user1
    );

    const updatedPerspective2 = await updatePerspective(
      mainPerspective,
      {
        headId: newDataCommit2,
        name: name,
      },
      user1.jwt
    );
    // ----- Finished adding the additional page. ------ //

    // Add a link to page 1
    const link1Commit = await createCommitAndData('new link', false, user1);
    const link1Perspecitve = await createPerspective(
      user1,
      998745,
      context,
      link1Commit
    );

    const newDataCommit3 = await addPagesOrLinks(
      [link1Perspecitve],
      false,
      [page1Commit],
      user1
    );

    const updatedPerspective3 = await updatePerspective(
      page1Perspective,
      {
        headId: newDataCommit3,
        name: name,
      },
      user1.jwt
    );
    // ----- Finsihed adding an aditional link to page1 ------ //

    // Add 2 links to page 2
    const link2Commit = await createCommitAndData('new link', false, user1);
    const link2Perspective = await createPerspective(
      user1,
      132564,
      context,
      link2Commit
    );

    const newDataCommit4 = await addPagesOrLinks(
      [link2Perspective],
      false,
      [page2Commit],
      user1
    );

    const updatedPerspective4 = await updatePerspective(
      page2Perspective,
      {
        headId: newDataCommit4,
        name: name,
      },
      user1.jwt
    );

    const link3Commit = await createCommitAndData('new link', false, user1);
    const link3Perspective = await createPerspective(
      user1,
      884565,
      context,
      link3Commit
    );

    const newDataCommit5 = await addPagesOrLinks(
      [link2Perspective, link3Perspective],
      false,
      [newDataCommit4],
      user1
    );

    const updatedPerspective5 = await updatePerspective(
      page2Perspective,
      {
        headId: newDataCommit5,
        name: name,
      },
      user1.jwt
    );
    // ----- Finished adding 2 additional links to page 2 ---- //

    // Add another page to update main perspective
    const page3Commit = await createCommitAndData('new page', false, user1);
    const page3Perspective = await createPerspective(
      user1,
      445648,
      context,
      page3Commit
    );

    // Add parent Id to the new data head
    const newDataCommit6 = await addPagesOrLinks(
      [page1Perspective, page2Perspective, page3Perspective],
      true,
      [newDataCommit2],
      user1
    );

    // Update perspective head with new data, linking new page.
    const updatedPerspective6 = await updatePerspective(
      mainPerspective,
      {
        headId: newDataCommit6,
        name: name,
      },
      user1.jwt
    );

    // Should point to itself
    const eco = await getPerspectiveRelatives(mainPerspective, 'ecosystem');

    expect(eco[0]).toEqual(mainPerspective);

    // Should have all element IDs in the returning array
    expect(eco).toEqual([
      mainPerspective,
      page1Perspective,
      page2Perspective,
      link1Perspecitve,
      link2Perspective,
      link3Perspective,
      page3Perspective,
    ]);

    // Should delete a famility if an intermediate parent node is deleted
    const newDataCommit7 = await addPagesOrLinks(
      [page1Perspective, page3Perspective],
      true,
      [newDataCommit6],
      user1
    );

    const updatedPerspective7 = await updatePerspective(
      mainPerspective,
      {
        headId: newDataCommit7,
        name: name,
      },
      user1.jwt
    );

    const eco1 = await getPerspectiveRelatives(mainPerspective, 'ecosystem');

    expect(eco1).toEqual([
      mainPerspective,
      page1Perspective,
      link1Perspecitve,
      page3Perspective,
    ]);

    // Should add a new child to link3Perspective
    const grandSonCommit = await createCommitAndData(
      'grandson link',
      false,
      user1
    );
    const grandsonPerspective = await createPerspective(
      user1,
      442132,
      context,
      grandSonCommit
    );

    const newDataCommit8 = await addPagesOrLinks(
      [link1Perspecitve, grandsonPerspective],
      false,
      [link1Commit],
      user1
    );

    const updatedPerspective8 = await updatePerspective(
      link1Perspecitve,
      {
        headId: newDataCommit8,
        name: name,
      },
      user1.jwt
    );

    const eco2 = await getPerspectiveRelatives(mainPerspective, 'ecosystem');
    const children = await getPerspectiveRelatives(mainPerspective, 'children');

    expect(eco2).toEqual([
      mainPerspective,
      page1Perspective,
      link1Perspecitve,
      page3Perspective,
      grandsonPerspective,
    ]);

    expect(children).toEqual([page1Perspective, page3Perspective]);

    done();
  });

  test('independent perspectives', async (done) => {
    const user1 = await createUser('seed1');
    const perspectiveAcontext = 'perspective.A.context';
    const perspectiveA1context = 'perspective.A1.context';
    const perspectiveA2context = 'perspective.A2.context';
    const perspectiveBcontext = 'perspective.B.context';

    // Branch A

    const A = await createAndInitPerspective(
      'base space A',
      true,
      user1,
      Date.now(),
      perspectiveAcontext
    );

    const PA1 = await createAndInitPerspective(
      'page A 1',
      false,
      user1,
      Date.now(),
      perspectiveA1context
    );

    await addChildToPerspective(PA1.persp, A.persp, A.commit, false, user1);

    const LA2 = await createAndInitPerspective(
      'link A 2',
      false,
      user1,
      Date.now(),
      perspectiveA2context
    );

    await addChildToPerspective(
      LA2.persp,
      PA1.persp,
      PA1.commit,
      false,
      user1
    );
    // End of branch A

    //-----------------------//

    // Branch B

    // Create perspectiveB

    const B = await createAndInitPerspective(
      'base space B',
      true,
      user1,
      141214,
      perspectiveBcontext
    );

    const PB1 = await forkPerspective(PA1.persp, user1);

    await addChildToPerspective(PB1, B.persp, B.commit, false, user1);

    const LB2 = (await getPerspectiveRelatives(PB1, 'children'))[0];

    const LC = await forkPerspective(LB2, user1);

    const independentPerspectives = (
      await getIndependentPerspectives(PA1.persp, user1.jwt)
    ).data;

    expect(independentPerspectives[0]).toEqual(PB1);

    const independentPerspectivesEco = (
      await getIndependentPerspectives(PA1.persp, user1.jwt, true)
    ).data;

    expect(independentPerspectivesEco[1]).toEqual(PB1);
    expect(independentPerspectivesEco[0]).toEqual(LC);

    done();
  });
});
