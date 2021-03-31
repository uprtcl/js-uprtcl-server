import { TestUser } from '../user/user.testsupport';
import { createData, getData } from '../data/test.support.data';
import {
  createPerspectives,
  getCommit,
  UpdateTest,
  forkPerspective,
  getPerspectiveDetails,
  sendPerspectiveBatch,
  updatePerspective,
} from './uprtcl.testsupport';
import { NewPerspective } from '@uprtcl/evees';

export enum DataNodeType {
  Title = 'title',
  Text = 'text',
}

export interface Content {
  value: string;
  context?: string;
}

export interface TestFlatPage {
  title: Content;
  text: Content[];
}

/**
 * Includes:
 * -> Home space
 *  -> Linked thoughts space
 *    -> Private
 *      -> An untitled page created on Private
 *    -> Blog
 */

export const createHomeSpace = async (user: TestUser) => {
  /**
   * We need to create the following structure:
   * 1) LinkedThoughts (Top element of the tree)
   * 2) Sections of the whole workspace
   *    2.a) Node to store sections
   *    2.b) Private section
   *    2.c) Blog section
   * 3) New page inside private section
   */

  // First we create the ending evees
  // Untitle page, blog and private sections.
  const dataForInitialNodes = await createData(
    [
      // Untitled page
      {
        text: '',
        type: 'Title',
        links: [],
      },
      // Blog section
      {
        title: 'Blog',
        pages: [],
      },
      // Private section
      {
        title: 'Private',
        pages: [],
      },
      {
        title: 'Forks',
        pages: []
      }
    ],
    user.jwt
  );

  // Commit the previous created data
  const commitInitialNodes = await createData(
    dataForInitialNodes.map((data) => {
      return {
        proof: {
          signature: '',
          proof: '',
        },
        payload: {
          creatorsIds: [],
          dataId: data.id,
          message: '',
          timestamp: Date.now(),
          parentsIds: [],
        },
      };
    }),
    user.jwt
  );

  // Create perspective for each head
  /**
   * We only send the headId as an update.
   * Later, we perform complete details update for every created perspective.
   */
  const perspectivesInitialNodes = await createPerspectives(
    user,
    commitInitialNodes.map((commit) => {
      return {
        perspectiveId: '',
        details: {
          headId: commit.id,
        },
      };
    })
  );

  /**
   * Now, in this second part we create the wrapper or container structures:
   * -> Sections structure.
   * -> LinkedThoughts structure (Top Element).
   */

  const dataForWrapperNodes = await createData(
    [
      // Sections
      {
        sections: [
          perspectivesInitialNodes[1].perspective.id,
          perspectivesInitialNodes[2].perspective.id,
          perspectivesInitialNodes[3].perspective.id
        ],
      },
      // Top element of the tree (Home space)
      // We still don't have the id of sections perspective.
      // We will add it later.
      {
        linkedThoughts: '',
      },
    ],
    user.jwt
  );

  // Commit the previous created data and add children to sections.
  const commitWrapperNodes = await createData(
    dataForWrapperNodes.map((data) => {
      return {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: data.id,
          message: '',
          timestamp: Date.now(),
          parentsIds: [],
        },
      };
    }),
    user.jwt
  );

  const perspectivesWrapperNodes = await createPerspectives(user, [
    {
      perspectiveId: '',
      details: {
        headId: commitWrapperNodes[0].id,
      },
      indexData: {
        linkChanges: {
          children: {
            added: [
              perspectivesInitialNodes[1].perspective.id,
              perspectivesInitialNodes[2].perspective.id,
              perspectivesInitialNodes[3].perspective.id
            ],
            removed: [],
          },
        },
      },
    },
    {
      perspectiveId: '',
      details: {
        headId: commitWrapperNodes[1].id,
      },
      context: `${user.userId}.home`,
    },
  ]);

  /** Compute guardianId
   * The guardianId can be any perspective,
   * but for intercreativity use cases,
   * given the home space as a specific situation
   * in this specific environment, we will compute
   * the guardianId based on a hierarchical logic.
   * */

  // We set the guardian Id for Untitled page.
  perspectivesInitialNodes[0].update.details.guardianId =
    perspectivesInitialNodes[2].perspective.id;
  // We set the guardian Id for Blog entity
  perspectivesInitialNodes[1].update.details.guardianId =
    perspectivesWrapperNodes[0].perspective.id;
  // We set the guardian Id for Private entity
  perspectivesInitialNodes[2].update.details.guardianId =
    perspectivesWrapperNodes[0].perspective.id;
  // We set the guardian Id for Forks entity
  perspectivesInitialNodes[3].update.details.guardianId =
  perspectivesWrapperNodes[0].perspective.id;
  // We set the guardian Id for sections enitity
  perspectivesWrapperNodes[0].update.details.guardianId =
    perspectivesWrapperNodes[1].perspective.id;

  // We are ready to send all perspectives
  const perspectives = perspectivesInitialNodes.concat(
    perspectivesWrapperNodes
  );
  await sendPerspectiveBatch(perspectives, user);

  // Update top element
  // Add link to blog.
  await updatePerspective(user.jwt, undefined, undefined, [
    // Update private perspective with new head and children.
    {
      perspectiveId: perspectivesWrapperNodes[1].perspective.id,
      details: {
        headId: commitWrapperNodes[1].id,
      },
      indexData: {
        linkChanges: {
          children: {
            added: [perspectivesWrapperNodes[0].perspective.id],
            removed: [],
          },
        },
      },
    },
  ]);

  /**
   * Update initial perspectives by:
   * -> Adding the new page to private.
   * -> Add a linksTo placeholder to blog.
   * -> Setting private as guardianId of the new page.
   */

  // Update blog head with new link
  const newBlogData = await createData(
    [
      // Adding link to blog data
      {
        title: 'Blog',
        pages: [],
        meta: {
          isA: ['bloglinksto'],
        },
      },
    ],
    user.jwt
  );

  // Commit new data.
  const newBlogDataCommit = await createData(
    [
      {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: newBlogData[0].id,
          message: '',
          timestamp: Date.now(),
          // Previous head of private
          parentsIds: [commitInitialNodes[1].id],
        },
      },
    ],
    user.jwt
  );

  // Add link to blog.
  await updatePerspective(user.jwt, undefined, undefined, [
    // Update private perspective with new head and children.
    {
      perspectiveId: perspectivesInitialNodes[1].perspective.id,
      details: {
        headId: newBlogDataCommit[0].id,
      },
      indexData: {
        linkChanges: {
          linksTo: {
            added: ['bloglinksto'],
            removed: [],
          },
        },
      },
    },
  ]);

  // Commit new page to private
  const newPageDataToPrivate = await createData(
    [
      // Private section
      {
        title: 'Private',
        pages: [perspectivesInitialNodes[0].perspective.id],
      },
    ],
    user.jwt
  );

  const newPageDataToPrivateCommit = await createData(
    [
      {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: newPageDataToPrivate[0].id,
          message: '',
          timestamp: Date.now(),
          // Previous head of private
          parentsIds: [commitInitialNodes[2].id],
        },
      },
    ],
    user.jwt
  );

  await updatePerspective(user.jwt, undefined, undefined, [
    // Update private perspective with new head and children.
    {
      perspectiveId: perspectivesInitialNodes[2].perspective.id,
      details: {
        headId: newPageDataToPrivateCommit[0].id,
      },
      indexData: {
        linkChanges: {
          children: {
            added: [perspectivesInitialNodes[0].perspective.id],
            removed: [],
          },
        },
      },
    },
    // Set private as guardianId of the new page.
    {
      perspectiveId: perspectivesInitialNodes[0].perspective.id,
      details: {
        guardianId: perspectivesInitialNodes[2].perspective.id,
      },
    },
  ]);

  // We update the top element of the tree with the sections id.
  // Finally, we set guardianId for sections, private and blog.

  const newDataForTopElement = await createData(
    [
      // Top element of the tree (Home space)
      // Now we have the sections id
      {
        linkedThoughts: [perspectivesWrapperNodes[0].perspective.id],
      },
    ],
    user.jwt
  );

  // We commit the new data
  const newTopElementCommit = await createData(
    [
      {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: newDataForTopElement[0].id,
          message: '',
          timestamp: Date.now(),
          parentsIds: [],
        },
      },
    ],
    user.jwt
  );

  await updatePerspective(user.jwt, undefined, undefined, [
    // Update top element of the tree
    {
      perspectiveId: perspectivesWrapperNodes[1].perspective.id,
      details: {
        headId: newTopElementCommit[0].id,
      },
      indexData: {
        linkChanges: {
          children: {
            added: [perspectivesWrapperNodes[0].perspective.id],
            removed: [],
          },
        },
      },
    },
  ]);

  return {
    linkedThoughts: perspectivesWrapperNodes[1],
    blog: perspectivesInitialNodes[1],
    private: perspectivesInitialNodes[2],
    forks: perspectivesInitialNodes[3]
  };
};

export const newTitle = async (
  title: Content,
  guardianId: string,
  user: TestUser
): Promise<NewPerspective> => {
  const titleData = await createData(
    [
      {
        text: title.value,
        type: 'Title',
        links: [],
      },
    ],
    user.jwt
  );

  const titleCommit = await createData(
    [
      {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: titleData[0].id,
          message: '',
          timestamp: Date.now(),
          parentsIds: [],
        },
      },
    ],
    user.jwt
  );

  const titlePerspective = await createPerspectives(user, [
    {
      perspectiveId: '',
      details: {
        headId: titleCommit[0].id,
        guardianId,
      },
      indexData: {
        text: title.value,
      },
      context: title.context,
    },
  ]);

  await sendPerspectiveBatch(titlePerspective, user);
  return titlePerspective[0];
};

export const newText = async (
  text: Content[],
  guardianId: string,
  user: TestUser
) => {
  const textDatas = await createData(
    text.map((content) => {
      return {
        text: content.value,
        type: 'Paragraph',
        links: [],
      };
    }),
    user.jwt
  );

  const textCommits = await createData(
    textDatas.map((data) => {
      return {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: data.id,
          message: '',
          timestamp: Date.now(),
          parentsIds: [],
        },
      };
    }),
    user.jwt
  );

  const textPerspectives = await createPerspectives(
    user,
    textCommits.map((commit, i) => {
      return {
        perspectiveId: '',
        details: {
          headId: commit.id,
          guardianId,
        },
        indexData: {
          text: text[i].value,
        },
        context: text[i].context,
      };
    })
  );

  await sendPerspectiveBatch(textPerspectives, user);
  return textPerspectives;
};

export const addNewElementsToPerspective = async (
  toPerspectiveId: string,
  newElementsIds: string[],
  user: TestUser
) => {
  const perspective = await getPerspectiveDetails(toPerspectiveId, user);

  let perspectiveData = perspective.data.slice?.entities[1].object;

  const perspectiveHeadId = perspective.data.details.headId;

  if (!perspectiveData.type) {
    newElementsIds.forEach((el) => {
      perspectiveData.pages.push(el);
    });
  } else {
    newElementsIds.forEach((el) => {
      perspectiveData.links.push(el);
    });
  }

  const newData = await createData([perspectiveData], user.jwt);
  const dataCommit = await createData(
    [
      {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: newData[0].id,
          message: '',
          timestamp: Date.now(),
          // Previous head of perspective
          parentsIds: [perspectiveHeadId],
        },
      },
    ],
    user.jwt
  );

  await updatePerspective(user.jwt, undefined, undefined, [
    {
      perspectiveId: toPerspectiveId,
      details: {
        headId: dataCommit[0].id,
      },
      indexData: {
        linkChanges: {
          children: {
            added: newElementsIds,
            removed: [],
          },
        },
      },
    },
  ]);
};

export const postElementToBlog = async (
  blogPerspectiveId: string,
  elementId: string,
  user: TestUser
) => {
  const forkedPerspective = await forkPerspective(elementId, user);
  const forkedPerspectiveDetails = await getPerspectiveDetails(
    forkedPerspective,
    user
  );
  let forkedData = await forkedPerspectiveDetails.data.slice?.entities[1]
    .object;
  forkedData.isA = ['textnodelinksto'];

  const newForkData = await createData([forkedData], user.jwt);

  const newForkCommit = await createData(
    [
      {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: newForkData[0].id,
          message: '',
          timestamp: Date.now(),
          parentsIds: [],
        },
      },
    ],
    user.jwt
  );

  await updatePerspective(user.jwt, undefined, undefined, [
    // Update private perspective with new head and children.
    {
      perspectiveId: forkedPerspective,
      details: {
        headId: newForkCommit[0].id,
      },
      indexData: {
        linkChanges: {
          linksTo: {
            added: ['textnodelinksto'],
            removed: [],
          },
        },
      },
    },
  ]);

  const blogPerspective = await getPerspectiveDetails(blogPerspectiveId, user);
  let blogData = blogPerspective.data.slice?.entities[1].object;
  const blogHeadId = blogPerspective.data.details.headId;

  if (blogData.pages) {
    blogData.pages.push(forkedPerspective);
  } else {
    throw new Error('Not a blog perspective.');
  }

  // Update blog
  const newBlogData = await createData([blogData], user.jwt);
  const updateCommit = await createData(
    [
      {
        proof: {
          signature: '',
          type: '',
        },
        payload: {
          creatorsIds: [],
          dataId: newBlogData[0].id,
          message: '',
          timestamp: Date.now(),
          // Previous head of perspective
          parentsIds: [blogHeadId],
        },
      },
    ],
    user.jwt
  );

  await updatePerspective(user.jwt, undefined, undefined, [
    {
      perspectiveId: blogPerspectiveId,
      details: {
        headId: updateCommit[0].id,
      },
      indexData: {
        linkChanges: {
          children: {
            added: [forkedPerspective],
            removed: [],
          },
        },
      },
    },
  ]);
};

export const createHerarchichalScenario = (user: string) => {
  return {
    data: [
      {
        id: 'zb2wwkQeeoundFws2tvLtaC3RzAKvqn73eLXu2nKXNST5eUZq',
        object: {
          text: 'Head1',
          type: 'Title',
          links: ['zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo'],
        },
      },
      {
        id: 'zb2wwvWTcsvFd3pK5qpj7pd7fLBUkjRQz9EnSyyV9gjyHs1gK',
        object: {
          proof: {
            signature: '',
            type: '',
          },
          payload: {
            creatorsIds: [],
            dataId: 'zb2wwkQeeoundFws2tvLtaC3RzAKvqn73eLXu2nKXNST5eUZq',
            message: '',
            timestamp: Date.now(),
            parentsIds: [],
          },
        },
      },
      {
        id: 'zb2wws8bKmpB269Bfg8XgwzH5iit2BQovugoUrqHyvJbheKxU',
        object: {
          proof: {
            signature: '',
            type: '',
          },
          payload: {
            creatorsIds: [],
            dataId: 'zb2wwkQeeoundFws2tvLtaC3RzAKvqn73eLXu2nKXNST5eUZq',
            message: '',
            timestamp: Date.now(),
            parentsIds: ['zb2wwhw2SVcyoQyrM7p3MNMCSt4ewjStrNpZTiU5Ug3PJcQ3U'],
          },
        },
      },
      {
        id: 'zb2wwvtnUmq8H7ejjmf9HVHAVSWFpeSj65FKvAX7ZKdQ8mSLR',
        object: {
          text: 'head2',
          type: 'Title',
          links: ['zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q'],
        },
      },
      {
        id: 'zb2wwnHxDiNBGUoDhegnkbuToE9BC2NPZZgdDwGXs9jjk6qdR',
        object: {
          proof: {
            signature: '',
            type: '',
          },
          payload: {
            creatorsIds: [],
            dataId: 'zb2wwvtnUmq8H7ejjmf9HVHAVSWFpeSj65FKvAX7ZKdQ8mSLR',
            message: '',
            timestamp: Date.now(),
            parentsIds: [],
          },
        },
      },
      {
        id: 'zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo',
        object: {
          payload: {
            creatorId: user,
            remote: 'http:evees-v1',
            path: 'http://localhost:3100/uprtcl/1',
            timestamp: Date.now(),
            context: 'zb2rhZZ4L82DVaG36xARJQrFTP3vH3HesXp5hhZixw6gHkezp',
          },
          proof: {
            signature: '',
            type: '',
          },
        },
      },
      {
        id: 'zb2www5RSXJEPbfDafWkcUYu5J9rhRzt5UWP8gZGm7bLwvWA3',
        object: {
          text: 'head3',
          type: 'Title',
          links: ['zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj'],
        },
      },
      {
        id: 'zb2wwqXVV1yoasQMQKmCV3vhgC6bfTVJGGG6Dq6ZhpPur42kR',
        object: {
          proof: {
            signature: '',
            type: '',
          },
          payload: {
            creatorsIds: [],
            dataId: 'zb2www5RSXJEPbfDafWkcUYu5J9rhRzt5UWP8gZGm7bLwvWA3',
            message: '',
            timestamp: Date.now(),
            parentsIds: [],
          },
        },
      },
      {
        id: 'zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q',
        object: {
          payload: {
            creatorId: user,
            remote: 'http:evees-v1',
            path: 'http://localhost:3100/uprtcl/1',
            timestamp: Date.now(),
            context: 'zb2rhZMXu6xCuEJG2Pc2SooWASLJGYNKkyZvU8qEb2ZeQCUsc',
          },
          proof: {
            signature: '',
            type: '',
          },
        },
      },
      {
        id: 'zb2wwrvX9ywbAQNJ4zbBhsKoeJ4jxNSCPZXp6Upe8rr9G5fDx',
        object: {
          text: 'head4',
          type: 'Title',
          links: ['zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ'],
        },
      },
      {
        id: 'zb2wwsfq53SWY5U6cpZLGSRu8mERFvroKm7kXngg2o8ZfGwkb',
        object: {
          proof: {
            signature: '',
            type: '',
          },
          payload: {
            creatorsIds: [],
            dataId: 'zb2wwrvX9ywbAQNJ4zbBhsKoeJ4jxNSCPZXp6Upe8rr9G5fDx',
            message: '',
            timestamp: Date.now(),
            parentsIds: [],
          },
        },
      },
      {
        id: 'zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj',
        object: {
          payload: {
            creatorId: user,
            remote: 'http:evees-v1',
            path: 'http://localhost:3100/uprtcl/1',
            timestamp: Date.now(),
            context: 'zb2rhan8q7CNLJAt17drzN13SyiMhkZ3PwcnLVF9djCdRUemN',
          },
          proof: {
            signature: '',
            type: '',
          },
        },
      },
      {
        id: 'zb2wwwZRNrKUUikvNmCmvRa35v4E8etBHnG5FHkFk53bCff2D',
        object: {
          text: 'head5',
          type: 'Title',
          links: ['zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN'],
        },
      },
      {
        id: 'zb2wwu21yz1DPDzHxRQFB7sfa8cbgyxD8tjjhTy9tUePbwpTb',
        object: {
          proof: {
            signature: '',
            type: '',
          },
          payload: {
            creatorsIds: [],
            dataId: 'zb2wwwZRNrKUUikvNmCmvRa35v4E8etBHnG5FHkFk53bCff2D',
            message: '',
            timestamp: Date.now(),
            parentsIds: [],
          },
        },
      },
      {
        id: 'zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ',
        object: {
          payload: {
            creatorId: user,
            remote: 'http:evees-v1',
            path: 'http://localhost:3100/uprtcl/1',
            timestamp: Date.now(),
            context: 'zb2rhbuMZUJurdTh1Y8CwAgqWfF9K95ZQxHTAnREDYwQKdaTM',
          },
          proof: {
            signature: '',
            type: '',
          },
        },
      },
      {
        id: 'zb2wwvDzh6MmGocwjbhGZV1Jyy5NKAsFsi48TwduKQkDd6tke',
        object: {
          text: 'head6',
          type: 'Title',
          links: [],
        },
      },
      {
        id: 'zb2wwssub8Dot9mvJapHHMYANh6oN28wMR9wfHmmWQMDpFbNF',
        object: {
          proof: {
            signature: '',
            type: '',
          },
          payload: {
            creatorsIds: [],
            dataId: 'zb2wwvDzh6MmGocwjbhGZV1Jyy5NKAsFsi48TwduKQkDd6tke',
            message: '',
            timestamp: Date.now(),
            parentsIds: [],
          },
        },
      },
      {
        id: 'zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN',
        object: {
          payload: {
            creatorId: user,
            remote: 'http:evees-v1',
            path: 'http://localhost:3100/uprtcl/1',
            timestamp: Date.now(),
            context: 'zb2rhcB1ZgZhkCmqgyUk8mm2uTU8sxbZNCAQPwTxEoozi6JFx',
          },
          proof: {
            signature: '',
            type: '',
          },
        },
      },
    ],
    perspectives: [
      {
        perspective: {
          id: 'zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo',
          object: {
            payload: {
              creatorId: user,
              remote: 'http:evees-v1',
              path: 'http://localhost:3100/uprtcl/1',
              timestamp: Date.now(),
              context: 'zb2rhZZ4L82DVaG36xARJQrFTP3vH3HesXp5hhZixw6gHkezp',
            },
            proof: {
              signature: '',
              type: '',
            },
          },
        },
        update: {
          perspectiveId: 'zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo',
          details: {
            headId: 'zb2wwnHxDiNBGUoDhegnkbuToE9BC2NPZZgdDwGXs9jjk6qdR',
            guardianId: 'zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh',
          },
          linkChanges: {
            children: {
              added: ['zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q'],
              removed: [],
            },
          },
        },
      },
      {
        perspective: {
          id: 'zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q',
          object: {
            payload: {
              creatorId: user,
              remote: 'http:evees-v1',
              path: 'http://localhost:3100/uprtcl/1',
              timestamp: Date.now(),
              context: 'zb2rhZMXu6xCuEJG2Pc2SooWASLJGYNKkyZvU8qEb2ZeQCUsc',
            },
            proof: {
              signature: '',
              type: '',
            },
          },
        },
        update: {
          perspectiveId: 'zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q',
          details: {
            headId: 'zb2wwqXVV1yoasQMQKmCV3vhgC6bfTVJGGG6Dq6ZhpPur42kR',
            guardianId: 'zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo',
          },
          linkChanges: {
            children: {
              added: ['zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj'],
              removed: [],
            },
          },
        },
      },
      {
        perspective: {
          id: 'zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj',
          object: {
            payload: {
              creatorId: user,
              remote: 'http:evees-v1',
              path: 'http://localhost:3100/uprtcl/1',
              timestamp: Date.now(),
              context: 'zb2rhan8q7CNLJAt17drzN13SyiMhkZ3PwcnLVF9djCdRUemN',
            },
            proof: {
              signature: '',
              type: '',
            },
          },
        },
        update: {
          perspectiveId: 'zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj',
          details: {
            headId: 'zb2wwsfq53SWY5U6cpZLGSRu8mERFvroKm7kXngg2o8ZfGwkb',
            guardianId: 'zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q',
          },
          linkChanges: {
            children: {
              added: ['zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ'],
              removed: [],
            },
          },
        },
      },
      {
        perspective: {
          id: 'zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ',
          object: {
            payload: {
              creatorId: user,
              remote: 'http:evees-v1',
              path: 'http://localhost:3100/uprtcl/1',
              timestamp: Date.now(),
              context: 'zb2rhbuMZUJurdTh1Y8CwAgqWfF9K95ZQxHTAnREDYwQKdaTM',
            },
            proof: {
              signature: '',
              type: '',
            },
          },
        },
        update: {
          perspectiveId: 'zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ',
          details: {
            headId: 'zb2wwu21yz1DPDzHxRQFB7sfa8cbgyxD8tjjhTy9tUePbwpTb',
            guardianId: 'zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj',
          },
          linkChanges: {
            children: {
              added: ['zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN'],
              removed: [],
            },
          },
        },
      },
      {
        perspective: {
          id: 'zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN',
          object: {
            payload: {
              creatorId: user,
              remote: 'http:evees-v1',
              path: 'http://localhost:3100/uprtcl/1',
              timestamp: Date.now(),
              context: 'zb2rhcB1ZgZhkCmqgyUk8mm2uTU8sxbZNCAQPwTxEoozi6JFx',
            },
            proof: {
              signature: '',
              type: '',
            },
          },
        },
        update: {
          perspectiveId: 'zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN',
          details: {
            headId: 'zb2wwssub8Dot9mvJapHHMYANh6oN28wMR9wfHmmWQMDpFbNF',
            guardianId: 'zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ',
          },
          linkChanges: {
            children: {
              added: [],
              removed: [],
            },
          },
        },
      },
    ],
    updates: [
      {
        perspectiveId: 'zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh',
        details: {
          headId: 'zb2wws8bKmpB269Bfg8XgwzH5iit2BQovugoUrqHyvJbheKxU',
        },
        oldDetails: {
          headId: 'zb2wwhw2SVcyoQyrM7p3MNMCSt4ewjStrNpZTiU5Ug3PJcQ3U',
          guardianId: 'zb2wwxorGthbSLv77G2He7zAwH4mL47vdPWNEY42GyGy7LsRt',
          canUpdate: true,
        },
        linkChanges: {
          children: {
            added: ['zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo'],
            removed: [],
          },
        },
      },
    ],
  };
};

export const createFlatScenario = async (
  pages: TestFlatPage[],
  user: TestUser
) => {
  const homeSpace = await createHomeSpace(user);
  let createdPages = [];
  let createdLinks: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const title = await newTitle(
      pages[i].title,
      homeSpace.private.perspective.id,
      user
    );

    createdPages.push(title);

    await addNewElementsToPerspective(
      homeSpace.private.perspective.id,
      [title.perspective.id],
      user
    );

    const pageContent = await newText(
      pages[i].text,
      title.perspective.id,
      user
    );

    const textIds = pageContent.map((page) => page.perspective.id);

    textIds.map((text) => {
      createdLinks.push(text);
    });

    await addNewElementsToPerspective(title.perspective.id, textIds, user);
  }

  return {
    linkedThoughts: homeSpace.linkedThoughts.perspective.id,
    blogId: homeSpace.blog.perspective.id,
    privateId: homeSpace.private.perspective.id,
    forksId: homeSpace.forks.perspective.id,
    pages: createdPages,
    links: createdLinks,
  };
};
