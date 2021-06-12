import { toBeValidCid, ERROR, NOT_AUTHORIZED_MSG, SUCCESS } from '../../utils';
import {
  createPerspectives,
  updatePerspective,
  getPerspectiveDetails,
  findPerspectives,
  deletePerspective,
  //createCommitAndData,
  //addPagesOrLinks,
  getPerspectiveRelatives,
  getIndependentPerspectives,
  // createAndInitPerspective,
  //forkPerspective,
  addChildToPerspective,
  sendDataBatch,
  sendPerspectiveBatch,
  getEcosystem,
  explore,
  forkPerspective,
} from './uprtcl.testsupport';
import { createUser, TestUser } from '../user/user.testsupport';
//import { DocumentsModule } from '@uprtcl/documents';
import {
  addPermission,
  setPublicPermission,
} from '../access/access.testsupport';
import {
  createHomeSpace,
  newTitle,
  addNewElementsToPerspective,
  newText,
  createHerarchichalScenario,
  TestFlatPage,
  createFlatScenario,
  postElementToBlog,
  FlatScenario,
} from '../uprtcl/uprtcl.mock.helper';
import { PermissionType } from '../uprtcl/types';
import {
  EveesContentModule,
  NewPerspective,
  AppElement,
  AppElements,
} from '@uprtcl/evees';
// import { HttpSupertest } from '@uprtcl/http-provider';
// import { EveesHttp } from '@uprtcl/evees-http';
import { Join } from './uprtcl.repository';
import { Test } from 'supertest';

const httpCidConfig: any = {
  version: 1,
  type: 'sha3-256',
  codec: 'raw',
  base: 'base58btc',
};

describe('routes', async () => {
  let userScenarioA: TestUser, pages: TestFlatPage[], scenario: FlatScenario;

  // Fork and independent perspectives scenario
  let userScenarioB: TestUser,
    pageBranchA: TestFlatPage[],
    p1: FlatScenario,
    p1children: string[],
    p2: string,
    p2children: string[],
    p31: string,
    p31children: string[],
    p321: string,
    p221: string,
    p421: string;

  beforeAll(async () => {
    // Emulate user.
    userScenarioA = await createUser('seed1');

    // Mock dummy pages for first possible scenario.
    pages = [
      {
        title: {
          value: 'What is Lorem Ipsum?',
        },
        text: [
          {
            value:
              'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
          },
        ],
      },
      {
        title: {
          value: 'Why do we use it',
        },
        text: [
          {
            value:
              'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout',
          },
        ],
      },
      {
        title: {
          value: 'Where does it come from?',
        },
        text: [
          {
            value:
              'Contrary to popular belief, Lorem Ipsum is not simply random text.',
          },
        ],
      },
    ];

    // Generate scenario.
    scenario = await createFlatScenario(pages, userScenarioA);

    // Publish pages
    await postElementToBlog(
      scenario.blogId,
      scenario.pages[0].id,
      userScenarioA
    );
    await postElementToBlog(
      scenario.blogId,
      scenario.pages[2].id,
      userScenarioA
    );

    // Forks scenario
    userScenarioB = await createUser('seed2');

    pageBranchA = [
      {
        title: {
          value: 'p1',
          context: 'c1',
        },
        text: [
          {
            value: 'p11',
            context: 'c11',
          },
          {
            value: 'p12',
            context: 'c12',
          },
        ],
      },
    ];

    p1 = await createFlatScenario(pageBranchA, userScenarioB);
    p1children = await getPerspectiveRelatives(p1.pages[0].id, 'children');
    // End of branch A

    // We fork treeA and convert it to treeB or top p2
    p2 = await forkPerspective(p1.pages[0].id, userScenarioB);

    // We create a new text
    const textP221 = await newText(
      [
        {
          value: 'p221',
          context: 'c221',
        },
      ],
      p2,
      userScenarioB
    );

    p2children = await getPerspectiveRelatives(p2, 'children');

    // Then we add it to the last treeB child or p22
    await addNewElementsToPerspective(
      p2children[1], // p22
      [textP221[0].perspective.hash],
      userScenarioB
    );

    p221 = (await getPerspectiveRelatives(p2children[1], 'children'))[0];

    // We fork the last treeB child and convert it to branchC or top p31
    // Children of this fork will be p321
    p31 = await forkPerspective(p2children[1], userScenarioB);
    p321 = (await getPerspectiveRelatives(p31, 'children'))[0];

    p31children = await getPerspectiveRelatives(p31, 'children');
    // We fork the treeC only child and call it treeD
    p421 = await forkPerspective(p31children[0], userScenarioB);
  });
  // expect.extend({ toBeValidCid });
  // test('CRUD private perspectives', async (done) => {
  //   const name = 'test';
  //   const context = 'wikipedia.barack_obama';
  //   const user1 = await createUser('seed1');
  //   const user2 = await createUser('seed2');
  //   const commit1Id = await createCommitAndData('text 123456', false, user1);
  //   const perspectiveId = await createPerspective(
  //     user1,
  //     Date.now(),
  //     context,
  //     commit1Id
  //   );
  //   const result1 = await getPerspectiveDetails(perspectiveId, user2.jwt);
  //   expect(result1.result).toEqual(ERROR);
  //   const result2 = await getPerspectiveDetails(perspectiveId, user1.jwt);
  //   expect(result2.data.headId).toEqual(commit1Id);
  //   /** set head */
  //   const commit2Id = await createCommitAndData('text 98765', false, user1);
  //   let result5 = await updatePerspective(
  //     user2.jwt,
  //     perspectiveId,
  //     {
  //       headId: commit2Id,
  //     },
  //   );
  //   expect(result5.result).toEqual(ERROR);
  //   expect(result5.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result6 = await updatePerspective(
  //     user1.jwt,
  //     perspectiveId,
  //     {
  //       headId: commit2Id,
  //     },
  //   );
  //   expect(result6.result).toEqual(SUCCESS);
  //   let result24 = await getPerspectiveDetails(perspectiveId, user2.jwt);
  //   expect(result24.data).toBeNull();
  //   expect(result24.result).toEqual(ERROR);
  //   expect(result24.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result25 = await getPerspectiveDetails(perspectiveId, '');
  //   expect(result25.data).toBeNull();
  //   expect(result25.result).toEqual(ERROR);
  //   expect(result25.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result26 = await getPerspectiveDetails(perspectiveId, user1.jwt);
  //   expect(result26.data.headId).toEqual(commit2Id);
  //   /** change read permisssion */
  //   let result27 = await getPerspectiveDetails(perspectiveId, user2.jwt);
  //   expect(result27.data).toBeNull();
  //   let result18 = await addPermission(
  //     perspectiveId,
  //     user2.userId,
  //     PermissionType.Read,
  //     user2.jwt
  //   );
  //   expect(result18.result).toEqual(ERROR);
  //   expect(result18.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result9 = await addPermission(
  //     perspectiveId,
  //     user2.userId,
  //     PermissionType.Read,
  //     user1.jwt
  //   );
  //   expect(result9.result).toEqual(SUCCESS);
  //   let result28 = await getPerspectiveDetails(perspectiveId, user2.jwt);
  //   expect(result28.data.headId).toEqual(commit2Id);
  //   /** update head */
  //   const commit3Id = await createCommitAndData('text 4745729', false, user1);
  //   let result7 = await updatePerspective(
  //     user2.jwt,
  //     perspectiveId,
  //     { headId: commit3Id }
  //   );
  //   expect(result7.result).toEqual(ERROR);
  //   let result10 = await addPermission(
  //     perspectiveId,
  //     user2.userId,
  //     PermissionType.Write,
  //     user1.jwt
  //   );
  //   expect(result10.result).toEqual(SUCCESS);
  //   let result8 = await updatePerspective(
  //     user2.jwt,
  //     perspectiveId,
  //     { headId: commit3Id }
  //   );
  //   expect(result8.result).toEqual(SUCCESS);
  //   let result29 = await getPerspectiveDetails(perspectiveId, user1.jwt);
  //   expect(result29.data.headId).toEqual(commit3Id);
  //   /** set public read */
  //   let user3 = await createUser('seed3');
  //   let result30 = await getPerspectiveDetails(perspectiveId, user3.jwt);
  //   expect(result30.data).toBeNull();
  //   let result11 = await setPublicPermission(
  //     perspectiveId,
  //     PermissionType.Read,
  //     true,
  //     user3.jwt
  //   );
  //   expect(result11.result).toEqual(ERROR);
  //   expect(result11.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result12 = await setPublicPermission(
  //     perspectiveId,
  //     PermissionType.Read,
  //     true,
  //     user1.jwt
  //   );
  //   expect(result12.result).toEqual(SUCCESS);
  //   let result31 = await getPerspectiveDetails(perspectiveId, user3.jwt);
  //   expect(result31.data.headId).toEqual(commit3Id);
  //   /** set public write */
  //   const commit4Id = await createCommitAndData(
  //     'text 47ssas45729',
  //     false,
  //     user1
  //   );
  //   let result14 = await updatePerspective(
  //     user3.jwt,
  //     perspectiveId,
  //     { headId: commit4Id }
  //   );
  //   expect(result14.result).toEqual(ERROR);
  //   expect(result14.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result16 = await setPublicPermission(
  //     perspectiveId,
  //     PermissionType.Write,
  //     true,
  //     user1.jwt
  //   );
  //   expect(result16.result).toEqual(SUCCESS);
  //   let result17 = await updatePerspective(
  //     user3.jwt,
  //     perspectiveId,
  //     { headId: commit4Id }
  //   );
  //   expect(result17.result).toEqual(SUCCESS);
  //   let result32 = await getPerspectiveDetails(perspectiveId, '');
  //   expect(result32.data.headId).toEqual(commit4Id);
  //   /** remove public permissions */
  //   let result20 = await setPublicPermission(
  //     perspectiveId,
  //     PermissionType.Write,
  //     false,
  //     user2.jwt
  //   );
  //   expect(result20.result).toEqual(ERROR);
  //   expect(result20.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result23 = await setPublicPermission(
  //     perspectiveId,
  //     PermissionType.Write,
  //     false,
  //     user1.jwt
  //   );
  //   expect(result23.result).toEqual(SUCCESS);
  //   let result19 = await updatePerspective(
  //     user3.jwt,
  //     perspectiveId,
  //     { headId: commit4Id }
  //   );
  //   expect(result19.result).toEqual(ERROR);
  //   expect(result19.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result22 = await setPublicPermission(
  //     perspectiveId,
  //     PermissionType.Read,
  //     false,
  //     user2.jwt
  //   );
  //   expect(result22.result).toEqual(ERROR);
  //   expect(result22.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result21 = await setPublicPermission(
  //     perspectiveId,
  //     PermissionType.Read,
  //     false,
  //     user1.jwt
  //   );
  //   expect(result21.result).toEqual(SUCCESS);
  //   let result33 = await getPerspectiveDetails(perspectiveId, '');
  //   expect(result33.data).toBeNull();
  //   /** delete perspective */
  //   let result41 = await deletePerspective(perspectiveId, user2.jwt);
  //   expect(result22.result).toEqual(ERROR);
  //   expect(result22.message).toEqual(NOT_AUTHORIZED_MSG);
  //   let result42 = await deletePerspective(perspectiveId, user1.jwt);
  //   expect(result42.result).toEqual(SUCCESS);
  //   done();
  // });
  // test('CRUD private perspective inherited', async (done) => {
  //   let user1 = await createUser('seed3');
  //   let user2 = await createUser('seed4');
  //   const context = 'wikipedia.barack_obama';
  //   const commit1Id = await createCommitAndData(
  //     'text 1234cddc56',
  //     false,
  //     user1
  //   );
  //   let perspectiveId1 = await createPerspective(
  //     user1,
  //     Date.now(),
  //     context,
  //     commit1Id
  //   );
  //   const commit2Id = await createCommitAndData(
  //     'text 1234cddc56',
  //     false,
  //     user1
  //   );
  //   let perspectiveId2 = await createPerspective(
  //     user1,
  //     Date.now(),
  //     context,
  //     commit2Id,
  //     perspectiveId1
  //   );
  //   let result1 = await getPerspectiveDetails(perspectiveId1, user2.jwt);
  //   expect(result1.result).toEqual(ERROR);
  //   let result2 = await getPerspectiveDetails(perspectiveId2, user2.jwt);
  //   expect(result2.result).toEqual(ERROR);
  //   let result3 = await getPerspectiveDetails(perspectiveId1, '');
  //   expect(result3.result).toEqual(ERROR);
  //   let result4 = await getPerspectiveDetails(perspectiveId2, '');
  //   expect(result4.result).toEqual(ERROR);
  //   let result5 = await getPerspectiveDetails(perspectiveId1, user1.jwt);
  //   expect(result5.data.headId).toEqual(commit1Id);
  //   let result6 = await getPerspectiveDetails(perspectiveId2, user1.jwt);
  //   expect(result6.data.headId).toEqual(commit2Id);
  //   done();
  // });
  // test('getContextPerspectives - private', async (done) => {
  //   const context = 'context.test-2' + Math.floor(Math.random() * 10000000);
  //   let user1 = await createUser('seed1');
  //   let user2 = await createUser('seed2');
  //   const name1 = 'persp 1';
  //   const perspectiveId1 = await createPerspective(user1, Date.now(), context);
  //   await updatePerspective(
  //     user1.jwt,
  //     perspectiveId1
  //   );
  //   const name2 = 'persp 2';
  //   const perspectiveId2 = await createPerspective(user1, Date.now(), context);
  //   await updatePerspective(
  //     user1.jwt,
  //     perspectiveId2
  //   );
  //   const name3 = 'persp 3';
  //   const perspectiveId3 = await createPerspective(user1, Date.now(), context);
  //   await updatePerspective(
  //     user2.jwt,
  //     perspectiveId3
  //   );
  //   let result12 = await setPublicPermission(
  //     perspectiveId1,
  //     PermissionType.Read,
  //     true,
  //     user1.jwt
  //   );
  //   expect(result12.result).toEqual(SUCCESS);
  //   const result1 = await findPerspectives({ context }, '');
  //   expect(result1.data.length).toEqual(1);
  //   expect(result1.data).toContain(perspectiveId1);
  //   const result2 = await findPerspectives({ context }, user1.jwt);
  //   expect(result2.data.length).toEqual(2);
  //   expect(result2.data).toContain(perspectiveId1);
  //   expect(result2.data).toContain(perspectiveId2);
  //   const result3 = await findPerspectives({ context }, user2.jwt);
  //   expect(result3.data.length).toEqual(2);
  //   expect(result3.data).toContain(perspectiveId1);
  //   expect(result3.data).toContain(perspectiveId3);
  //   let result4 = await deletePerspective(perspectiveId1, user1.jwt);
  //   expect(result4.result).toEqual(SUCCESS);
  //   const result5 = await findPerspectives({ context }, user1.jwt);
  //   expect(result5.data.length).toEqual(1);
  //   expect(result5.data).toContain(perspectiveId2);
  //   done();
  // });
  // test('update ecosystem', async (done) => {
  //   const name = 'test';
  //   const context = 'wikipedia.barack_obama';
  //   const user1 = await createUser('seed1');
  //   /** update ecosystem */
  //   // Add links or pages to a perspective
  //   // Create perspective head with empty space
  //   const commitIdBase = await createCommitAndData('base space', true, user1);
  //   const mainPerspective = await createPerspective(
  //     user1,
  //     556874,
  //     context,
  //     commitIdBase
  //   );
  //   // Create page1
  //   const page1Commit = await createCommitAndData('new page', false, user1);
  //   const page1Perspective = await createPerspective(
  //     user1,
  //     879456,
  //     context,
  //     page1Commit
  //   );
  //   // Add parent Id to the new data head
  //   const newDataCommit1 = await addPagesOrLinks(
  //     [page1Perspective],
  //     true,
  //     [commitIdBase],
  //     user1
  //   );
  //   // Update perspective head with new data, linking new page.
  //   const updatedPerspective1 = await updatePerspective(
  //     user1.jwt,
  //     mainPerspective,
  //     {
  //       headId: newDataCommit1
  //     }
  //   );
  //   // Add one more page
  //   const page2Commit = await createCommitAndData('new page', false, user1);
  //   const page2Perspective = await createPerspective(
  //     user1,
  //     333548,
  //     context,
  //     page2Commit
  //   );
  //   const newDataCommit2 = await addPagesOrLinks(
  //     [page1Perspective, page2Perspective],
  //     true,
  //     [newDataCommit1],
  //     user1
  //   );
  //   const updatedPerspective2 = await updatePerspective(
  //     user1.jwt,
  //     mainPerspective,
  //     {
  //       headId: newDataCommit2
  //     }
  //   );
  //   // ----- Finished adding the additional page. ------ //
  //   // Add a link to page 1
  //   const link1Commit = await createCommitAndData('new link', false, user1);
  //   const link1Perspecitve = await createPerspective(
  //     user1,
  //     998745,
  //     context,
  //     link1Commit
  //   );
  //   const newDataCommit3 = await addPagesOrLinks(
  //     [link1Perspecitve],
  //     false,
  //     [page1Commit],
  //     user1
  //   );
  //   const updatedPerspective3 = await updatePerspective(
  //     user1.jwt,
  //     page1Perspective,
  //     {
  //       headId: newDataCommit3
  //     }
  //   );
  //   // ----- Finsihed adding an aditional link to page1 ------ //
  //   // Add 2 links to page 2
  //   const link2Commit = await createCommitAndData('new link', false, user1);
  //   const link2Perspective = await createPerspective(
  //     user1,
  //     132564,
  //     context,
  //     link2Commit
  //   );
  //   const newDataCommit4 = await addPagesOrLinks(
  //     [link2Perspective],
  //     false,
  //     [page2Commit],
  //     user1
  //   );
  //   const updatedPerspective4 = await updatePerspective(
  //     user1.jwt,
  //     page2Perspective,
  //     {
  //       headId: newDataCommit4
  //     }
  //   );
  //   const link3Commit = await createCommitAndData('new link', false, user1);
  //   const link3Perspective = await createPerspective(
  //     user1,
  //     884565,
  //     context,
  //     link3Commit
  //   );
  //   const newDataCommit5 = await addPagesOrLinks(
  //     [link2Perspective, link3Perspective],
  //     false,
  //     [newDataCommit4],
  //     user1
  //   );
  //   const updatedPerspective5 = await updatePerspective(
  //     user1.jwt,
  //     page2Perspective,
  //     {
  //       headId: newDataCommit5
  //     }
  //   );
  //   // ----- Finished adding 2 additional links to page 2 ---- //
  //   // Add another page to update main perspective
  //   const page3Commit = await createCommitAndData('new page', false, user1);
  //   const page3Perspective = await createPerspective(
  //     user1,
  //     445648,
  //     context,
  //     page3Commit
  //   );
  //   // Add parent Id to the new data head
  //   const newDataCommit6 = await addPagesOrLinks(
  //     [page1Perspective, page2Perspective, page3Perspective],
  //     true,
  //     [newDataCommit2],
  //     user1
  //   );
  //   // Update perspective head with new data, linking new page.
  //   const updatedPerspective6 = await updatePerspective(
  //     user1.jwt,
  //     mainPerspective,
  //     {
  //       headId: newDataCommit6
  //     }
  //   );
  //   // Should point to itself
  //   const eco = await getPerspectiveRelatives(mainPerspective, 'ecosystem');
  //   expect(eco[0]).toEqual(mainPerspective);
  //   // Should have all element IDs in the returning array
  //   expect(eco).toEqual([
  //     mainPerspective,
  //     page1Perspective,
  //     page2Perspective,
  //     link1Perspecitve,
  //     link2Perspective,
  //     link3Perspective,
  //     page3Perspective,
  //   ]);
  //   // Should delete a famility if an intermediate parent node is deleted
  //   const newDataCommit7 = await addPagesOrLinks(
  //     [page1Perspective, page3Perspective],
  //     true,
  //     [newDataCommit6],
  //     user1
  //   );
  //   const updatedPerspective7 = await updatePerspective(
  //     user1.jwt,
  //     mainPerspective,
  //     {
  //       headId: newDataCommit7
  //     }
  //   );
  //   const eco1 = await getPerspectiveRelatives(mainPerspective, 'ecosystem');
  //   expect(eco1).toEqual([
  //     mainPerspective,
  //     page1Perspective,
  //     link1Perspecitve,
  //     page3Perspective,
  //   ]);
  //   // Should add a new child to link3Perspective
  //   const grandSonCommit = await createCommitAndData(
  //     'grandson link',
  //     false,
  //     user1
  //   );
  //   const grandsonPerspective = await createPerspective(
  //     user1,
  //     442132,
  //     context,
  //     grandSonCommit
  //   );
  //   const newDataCommit8 = await addPagesOrLinks(
  //     [link1Perspecitve, grandsonPerspective],
  //     false,
  //     [link1Commit],
  //     user1
  //   );
  //   const updatedPerspective8 = await updatePerspective(
  //     user1.jwt,
  //     link1Perspecitve,
  //     {
  //       headId: newDataCommit8
  //     }
  //   );
  //   const eco2 = await getPerspectiveRelatives(mainPerspective, 'ecosystem');
  //   const children = await getPerspectiveRelatives(mainPerspective, 'children');
  //   expect(eco2).toEqual([
  //     mainPerspective,
  //     page1Perspective,
  //     link1Perspecitve,
  //     page3Perspective,
  //     grandsonPerspective,
  //   ]);
  //   expect(children).toEqual([page1Perspective, page3Perspective]);
  //   done();
  // });

  test('batch create', async (done) => {
    // Emulate the user

    // const user = await createUser('seed1');
    // //const homeSpace = await createHomeSpace(user);

    // const httpConnection = await new HttpSupertest(
    //   process.env.HOST as string,
    //   user
    // );

    // const httpEvees = new EveesHttp(httpConnection);

    // const remotes = [httpEvees];
    //const modules = new Map<string, EveesContentModule>();
    //modules.set(DocumentsModule.id, new DocumentsModule());

    //const evees = init(remotes, modules);

    // const appElementsInit: AppElement = {
    //   path: '/',
    //   getInitData: (children?: AppElement[]) => {
    //     if (children)
    //       return { links: children.map((child) => child.perspective?.id) };
    //   },
    //   children: [
    //     {
    //       path: '/privateSection',
    //       getInitData: (children?: AppElement[]) => {
    //         if (children)
    //           return {
    //             text: 'Private',
    //             type: TextType.Title,
    //             links: children.map((child) => child.perspective?.id),
    //           };
    //       },
    //       children: [
    //         {
    //           path: '/firstPage',
    //           optional: true,
    //           getInitData: () => {
    //             return {
    //               text: '',
    //               type: TextType.Title,
    //               links: [],
    //             };
    //           },
    //         },
    //       ],
    //     },
    //     {
    //       path: '/blogSection',
    //       getInitData: () => {
    //         return {
    //           text: 'Blog',
    //           type: TextType.Title,
    //           links: [],
    //         };
    //       },
    //     },
    //   ],
    // };

    // const elements = new AppElements(evees, appElementsInit);
    // await elements.check();

    // // Create scenario A

    // // Head 1
    // const head1 = await newTitle(
    //   'Head 1',
    //   homeSpace.private.perspective.id,
    //   user
    // );

    // await addNewElementToPerspective(
    //   homeSpace.private.perspective.id,
    //   head1.perspective.id,
    //   user
    // );

    // // Head 2
    // const head2 = await newTitle('Head 2', head1.perspective.id, user);

    // await addNewElementToPerspective(
    //   head1.perspective.id,
    //   head2.perspective.id,
    //   user
    // );

    // // Head 3
    // const head3 = await newTitle('Head 3', head2.perspective.id, user);

    // await addNewElementToPerspective(
    //   head2.perspective.id,
    //   head3.perspective.id,
    //   user
    // );

    // // Head 4
    // const head4 = await newTitle('Head 4', head3.perspective.id, user);

    // await addNewElementToPerspective(
    //   head3.perspective.id,
    //   head4.perspective.id,
    //   user
    // );

    // // Head 5
    // const head5 = await newTitle('Head 5', head4.perspective.id, user);

    // await addNewElementToPerspective(
    //   head4.perspective.id,
    //   head5.perspective.id,
    //   user
    // );

    // // Head 6
    // const head6 = await newTitle('Head 6', head5.perspective.id, user);

    // await addNewElementToPerspective(
    //   head5.perspective.id,
    //   head6.perspective.id,
    //   user
    // );

    // // We concat all perspectives for this test
    // const allPerspectives = homeSpace.perspectives.concat(scenarioA.perspectives);
    // // Gets the ecosystem of every perspective from the DB.
    // const ecosystemPersp = await Promise.all(
    //   allPerspectives.map(async (p: any) => {
    //     return {
    //       id: p.perspective.id,
    //       ecosystem: await getEcosystem(p.perspective.id)
    //     }
    //   })
    // );
    // const allUpdates = allPerspectives.map((p:any) => p.update).sort();
    // // Gets the ecosystem algorithmically
    // const recurseChildren = (children: Object[], algEcosystem: string[]): String[] => {
    //   children.map((child: any) => {
    //     const { linkChanges: { children: {  added } } } = child;
    //     scenarioA.updates.filter((a: any) => added.indexOf(a.perspectiveId) > -1).map((update: any) => {
    //       update.linkChanges.children.added.map((child:any) => {
    //         added.push(child)
    //       })
    //     })
    //     if(added.length > 0) {
    //       const childrenObjects = allUpdates.filter((a: any) => added.indexOf(a.perspectiveId) > -1);
    //       added.map((child: any) => {
    //         algEcosystem.push(child);
    //       });
    //       recurseChildren(childrenObjects, algEcosystem);
    //     }
    //   });
    //   return algEcosystem;
    // }
    // // Checks the ecoystem of every element created for the test.
    // allUpdates.map((update: any) => {
    //   const { linkChanges: { children: { added } } } = update;
    //   if(added.length === 0) {
    //     // We look for children in possible next updates.
    //     const nextUpdates = scenarioA.updates.filter((s: any) => update.perspectiveId === s.perspectiveId);
    //     nextUpdates.map((next: any) => {
    //       next.linkChanges.children.added.map((child: any) => {
    //         added.push(child);
    //       });
    //     });
    //   }
    //   const childrenObjects = allUpdates.filter((a: any) => added.indexOf(a.perspectiveId) > -1);
    //   const final = added;
    //   // Array computed in tests
    //   const ecosystem = final.concat(recurseChildren(childrenObjects, []));
    //   ecosystem.push(update.perspectiveId);
    //   // Position of our current ID inside the ecosystem fetched from DB.
    //   const pos = ecosystemPersp.map((persp:any) => persp.id).indexOf(update.perspectiveId);
    //   // Array coming from DB
    //   const dbEcosystem = ecosystemPersp[pos].ecosystem;
    //   // Both arrays must match to pass the test
    //   expect([... new Set(ecosystem.sort())]).toEqual(dbEcosystem.sort());
    // });
    // TODO:
    // Make ACL tests
    // Ecosystem substraction tests
    done();
  });

  test('search by text in both private and blog', async (done) => {
    const privateResult = await explore(
      {
        text: {
          value: 'Lorem',
        },
      },
      userScenarioA
    );

    expect(privateResult.data.perspectiveIds.length).toBe(6);

    const generalResult = await explore({
      text: {
        value: 'Lorem',
      },
    });

    // It should be 3, but the `postElementToBlog` function needs
    // work improvement with ACL.
    // FinalDelegatedTo is not being properly assigned to
    // elements added to blogs.
    expect(generalResult.data.perspectiveIds.length).toBe(0);
    done();
  });

  test('search by linksTo', async (done) => {
    const result = await explore(
      {
        linksTo: {
          joinType: Join.full,
          elements: ['textnodelinksto'],
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds.length).toBe(2);
    done();
  });

  test('search by text and linksTo', async (done) => {
    const levelZeroResult = await explore(
      {
        linksTo: {
          joinType: Join.full,
          elements: ['textnodelinksto'],
        },
        text: {
          value: 'Lorem',
          textLevels: 0,
        },
      },
      userScenarioA
    );

    expect(levelZeroResult.data.perspectiveIds.length).toBe(1);
    done();
  });

  test('search under', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.inner,
          elements: [
            {
              id: scenario.privateId,
            },
          ],
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds.length).toBe(7);
    done();
  });

  test('seacrh by under and text', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: scenario.privateId,
            },
          ],
        },
        text: {
          value: 'long established',
          textLevels: 0,
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds.length).toBe(1);
    done();
  });

  test('search by under and linksTo', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: scenario.linkedThoughts,
            },
          ],
        },
        linksTo: {
          joinType: Join.full,
          elements: ['textnodelinksto'],
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds.length).toBe(2);
    done();
  });

  test('search by under, linksTo and text', async (done) => {
    // Post pages
    await postElementToBlog(
      scenario.blogId,
      scenario.pages[0].id,
      userScenarioA
    );
    await postElementToBlog(
      scenario.blogId,
      scenario.pages[1].id,
      userScenarioA
    );

    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: scenario.linkedThoughts,
            },
          ],
        },
        linksTo: {
          joinType: Join.full,
          elements: ['textnodelinksto'],
        },
        text: {
          value: 'Why do we use it',
          textLevels: -1,
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds.length).toBe(1);
    done();
  });

  test('search above', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.inner,
          elements: [
            {
              id: scenario.pages[2].links[0],
              direction: 'above',
            },
          ],
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds.length).toBe(5);

    // Expects for its inmediate parent page
    expect(result.data.perspectiveIds[0]).toEqual(scenario.pages[2].id);
    // Excepts for itself
    expect(result.data.perspectiveIds[1]).toEqual(scenario.pages[2].links[0]);
    // Expects for private
    expect(result.data.perspectiveIds[2]).toEqual(scenario.privateId);
    // Expects for linkedThoughts
    expect(result.data.perspectiveIds[3]).toEqual(scenario.linkedThoughts);
    // At the very last it expects for sections nodes.
    done();
  });

  test('seacrh by above and text', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: scenario.pages[1].links[0],
              direction: 'above',
            },
          ],
        },
        text: {
          value: 'Why do we use it',
          textLevels: 0,
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds[0]).toEqual(scenario.pages[1].id);
    done();
  });

  test('search by above and linksTo', async (done) => {
    // Post pages
    const postedPage1 = await postElementToBlog(
      scenario.blogId,
      scenario.pages[0].id,
      userScenarioA
    );

    const page1relatives = await getPerspectiveRelatives(
      postedPage1,
      'children'
    );

    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: page1relatives[0],
              direction: 'above',
            },
          ],
        },
        linksTo: {
          joinType: Join.full,
          elements: ['textnodelinksto'],
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds[0]).toEqual(postedPage1);
    done();
  });

  test('search by above, linksTo and text', async (done) => {
    // Post pages
    const postedPage1 = await postElementToBlog(
      scenario.blogId,
      scenario.pages[1].id,
      userScenarioA
    );

    const page1relatives = await getPerspectiveRelatives(
      postedPage1,
      'children'
    );

    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: page1relatives[0],
              direction: 'above',
            },
          ],
        },
        linksTo: {
          joinType: Join.full,
          elements: ['textnodelinksto'],
        },
        text: {
          value: 'Why do we use it',
          textLevels: -1,
        },
      },
      userScenarioA
    );

    expect(result.data.perspectiveIds.length).toBe(1);
    done();
  });

  test('search forks within the children of a given perspective (under level = 1)', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: p1.pages[0].id,
              levels: 1,
              forks: {
                independent: false,
                exclusive: true,
              },
            },
          ],
        },
      },
      userScenarioB
    );

    // Should receive p2, p21, p22, p31

    expect(result.data.perspectiveIds.length).toEqual(4);
    expect(result.data.perspectiveIds[0]).toEqual(p31);
    expect(result.data.perspectiveIds[1]).toEqual(p2children[1]);
    expect(result.data.perspectiveIds[2]).toEqual(p2);
    expect(result.data.perspectiveIds[3]).toEqual(p2children[0]);

    done();
  });

  test('search independent forks within a perspective ecosystem (under level = -1)', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: p1.pages[0].id,
              forks: {
                exclusive: true,
              },
            },
          ],
        },
      },
      userScenarioB
    );

    expect(result.data.perspectiveIds.length).toEqual(1);
    expect(result.data.perspectiveIds[0]).toEqual(p31);
    done();
  });

  test('search independent forks within a perspective ecosystem and independent forks of top element (under level = -1)', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: p2children[1],
              forks: {
                independentOf: p2,
                exclusive: true,
              },
            },
          ],
        },
      },
      userScenarioB
    );

    expect(result.data.perspectiveIds.length).toEqual(2);
    expect(result.data.perspectiveIds[0]).toEqual(p421);
    expect(result.data.perspectiveIds[1]).toEqual(p31);

    done();
  });

  test('search forks within the ecosystem or children of many perspectives (level 1 and level -1 | multiple under elements)', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: p1.pages[0].id,
              levels: 1,
              forks: {
                exclusive: true,
              },
            },
            {
              id: p2,
              levels: 1,
              forks: {
                exclusive: true,
              },
            },
          ],
        },
      },
      userScenarioB
    );

    // Results with level 1
    expect(result.data.perspectiveIds.length).toEqual(1);
    expect(result.data.perspectiveIds[0]).toEqual(p31);

    const resultEcosystem = await explore(
      {
        start: {
          joinType: Join.full,
          elements: [
            {
              id: p1.pages[0].id,
              forks: {
                exclusive: true,
              },
            },
            {
              id: p2,
              forks: {
                exclusive: true,
              },
            },
          ],
        },
      },
      userScenarioB
    );

    // Results with level -1
    expect(resultEcosystem.data.perspectiveIds.length).toEqual(2);
    expect(resultEcosystem.data.perspectiveIds[0]).toEqual(p421);
    expect(resultEcosystem.data.perspectiveIds[1]).toEqual(p31);
    done();
  });

  test('search all', async (done) => {
    const result = await explore({}, userScenarioA);

    expect(result.data.perspectiveIds.length).toBe(10);
    done();
  });

  test('-> inner -> exclusive -> above -> -1', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.inner,
          elements: [
            {
              id: p1children[0],
              direction: 'above',
              forks: {
                exclusive: true,
              },
            },
            {
              id: p221,
              direction: 'above',
              forks: {
                exclusive: true,
              },
            },
          ],
        },
      },
      userScenarioB
    );

    expect(result.data.perspectiveIds).toHaveLength(1);
    expect(result.data.perspectiveIds[0]).toEqual(p31);

    done();
  });

  test('-> inner -> exclusive -> above -> -1', async (done) => {
    const result = await explore(
      {
        start: {
          joinType: Join.inner,
          elements: [
            {
              id: p221,
              direction: 'above',
              forks: {
                exclusive: true,
                independent: true,
              },
            },
            {
              id: p321,
              direction: 'above',
              forks: {
                exclusive: true,
                independent: true,
              },
            },
          ],
        },
      },
      userScenarioB
    );

    expect(result.data.perspectiveIds).toHaveLength(0);
    done();
  });

  // TODO: Test exclusive: false and all forks
});
