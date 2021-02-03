import { TestUser } from '../user/user.testsupport';

export const createHomePerspective = async (user: TestUser) => {
  return {
      perspective: {
        id: "zb2wwmih6X9wVG8eGPHsKcSQZDmHrpRR7Jr2tY489DQUayq3v",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorId: user.userId,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: 0,
            context: `${user.userId}.home`,
          },
        },
        casID: "http:store:http://localhost:3100/uprtcl/1",
      },
      details: {
      },
    }
}


export const createFirstPage =  (user: TestUser) => {
  const pageData =  [
    {
      id: "zb2wwjmVd2dKAKkT7YUwycVndnkY9U5pKsthizW6BUaHM9Gx8",
      object: {
        title: "",
        pages: [
          "zb2wwhmRinUyisXA8RXXMonzWqDAGyMfEWZaahDPC51UiV6a8",
        ],
      },
    },
    {
      id: "zb2wwpVGNB1Y1PJV36JWtuisxXP13L6xGhQaSSFGka7xyqZbS",
      object: {
        proof: {
          signature: "",
          type: "",
        },
        payload: {
          creatorsIds: [
          ],
          dataId: "zb2wwjmVd2dKAKkT7YUwycVndnkY9U5pKsthizW6BUaHM9Gx8",
          message: "",
          timestamp: Date.now(),
          parentsIds: [
          ],
        },
      },
    },
    {
      id: "zb2wwrGhXNzLPruvVbLHhmtuaPKGcD6NzmKHLLRo4biWkP8yx",
      object: {
        text: "",
        type: "Title",
        links: [
        ],
      },
    },
    {
      id: "zb2wwyNDa9hzXenC5Afv4FieCRtrJAZE5YZ2nXafz9LxaTWuN",
      object: {
        proof: {
          signature: "",
          type: "",
        },
        payload: {
          creatorsIds: [
          ],
          dataId: "zb2wwrGhXNzLPruvVbLHhmtuaPKGcD6NzmKHLLRo4biWkP8yx",
          message: "",
          timestamp: Date.now(),
          parentsIds: [
          ],
        },
      },
    },
  ]

  const pagePerspective = [
      {
        perspective: {
          id: "zb2wwhmRinUyisXA8RXXMonzWqDAGyMfEWZaahDPC51UiV6a8",
          object: {
            proof: {
              signature: "",
              type: "",
            },
            payload: {
              creatorId: user.userId,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2rhj4L3i3EL8jhEhaiLuN46jf7jvuSyTRQNsjvYSP7KwkZK",
            },
          },
          casID: "http:store:http://localhost:3100/uprtcl/1",
        },
        details: {
          headId: "zb2wwyNDa9hzXenC5Afv4FieCRtrJAZE5YZ2nXafz9LxaTWuN",
        },
        parentId: "zb2wwmih6X9wVG8eGPHsKcSQZDmHrpRR7Jr2tY489DQUayq3v",
      },
    ]

  const updates = [
    {
      id: "zb2wwmih6X9wVG8eGPHsKcSQZDmHrpRR7Jr2tY489DQUayq3v",
      details: {
        headId: "zb2wwpVGNB1Y1PJV36JWtuisxXP13L6xGhQaSSFGka7xyqZbS",
        addedChildren: pagePerspective.map(p => p.perspective.id)
      },
    },
  ]

  return { pageData, pagePerspective, updates }
}

export const createHerarchichalScenario = (user: TestUser) => {
  const pageData = [
  {
    id: "zb2wwiX3NKhvWzv5AGVm7pAkjC5bWzjzWbftgCaAWFGzHbUBU",
    object: {
      text: "head5",
      type: "Title",
      links: [
        "zb2wwvnYkgQbkMhDmDnunYMk97VPUPVw8WdWTrrTqhLzW1DSu",
      ],
    },
  },
  {
    id: "zb2wwkV2YqxnrbzLzancrVxorJJz1GR2B7HhNQXxsrLeKApUh",
    object: {
      proof: {
        signature: "",
        type: "",
      },
      payload: {
        creatorsIds: [
        ],
        dataId: "zb2wwwb9ATfTtXHZMxQC9FBW3u3pQwKrwyj76heHXK5GvZBr5",
        message: "",
        timestamp: Date.now(),
        parentsIds: [
        ],
      },
    },
  },
  {
    id: "zb2wwmAnQxUfn2WpTW55sHUqwAWAXa9D8og7EYWPLeC65YKgC",
    object: {
      proof: {
        signature: "",
        type: "",
      },
      payload: {
        creatorsIds: [
        ],
        dataId: "zb2wwiX3NKhvWzv5AGVm7pAkjC5bWzjzWbftgCaAWFGzHbUBU",
        message: "",
        timestamp: Date.now(),
        parentsIds: [
        ],
      },
    },
  },
  {
    id: "zb2wwmRF9Rnz4qZhFbxbN4anHr5wt5MSMETqGj6hKEkv6Scdv",
    object: {
      proof: {
        signature: "",
        type: "",
      },
      payload: {
        creatorsIds: [
        ],
        dataId: "zb2wwsJarMxegjpzbJRqxbkmCGkqTvL5wp4nHu2hub96R6WcA",
        message: "",
        timestamp: Date.now(),
        parentsIds: [
          "zb2wwyNDa9hzXenC5Afv4FieCRtrJAZE5YZ2nXafz9LxaTWuN",
        ],
      },
    },
  },
  {
    id: "zb2wwnTXb4ACHnx3D2C5vEcLfxg8AtnxZRRdy4v5ZtLHufwN2",
    object: {
      proof: {
        signature: "",
        type: "",
      },
      payload: {
        creatorsIds: [
        ],
        dataId: "zb2wwvDzh6MmGocwjbhGZV1Jyy5NKAsFsi48TwduKQkDd6tke",
        message: "",
        timestamp: Date.now(),
        parentsIds: [
        ],
      },
    },
  },
  {
    id: "zb2wwoT6tMZGU5q2NMzD8kYJPLRtZ769wzSHT6Jg3vc2fuvuW",
    object: {
      text: "head3",
      type: "Title",
      links: [
        "zb2wwqLCxrfmeQyZsbivGFfbg3eLpCo7MmQ9FNBTh7easN5hp",
      ],
    },
  },
  {
    id: "zb2wws1KMpHijNYqN3Bg4Yy5WSayGAuGXyLMthKGfrWBfMzYP",
    object: {
      proof: {
        signature: "",
        type: "",
      },
      payload: {
        creatorsIds: [
        ],
        dataId: "zb2wwvefS4HGGwggJ8QB9Zk1bQtut8oG6YeQ92S17rVreM2oZ",
        message: "",
        timestamp: Date.now(),
        parentsIds: [
        ],
      },
    },
  },
  {
    id: "zb2wwsJarMxegjpzbJRqxbkmCGkqTvL5wp4nHu2hub96R6WcA",
    object: {
      text: "Head 1",
      type: "Title",
      links: [
        "zb2wwygjh4AhRqbNyVVVoydAyi4TbUfEgAwHaigkVTK5RgE1r",
      ],
    },
  },
  {
    id: "zb2wwvDzh6MmGocwjbhGZV1Jyy5NKAsFsi48TwduKQkDd6tke",
    object: {
      text: "head6",
      type: "Title",
      links: [
      ],
    },
  },
  {
    id: "zb2wwvefS4HGGwggJ8QB9Zk1bQtut8oG6YeQ92S17rVreM2oZ",
    object: {
      text: "head4",
      type: "Title",
      links: [
        "zb2wwr51zazEnWnNP99R7a5qyJXPMkS6NL5mCCZt5RjSFuFAd",
      ],
    },
  },
  {
    id: "zb2wwwb9ATfTtXHZMxQC9FBW3u3pQwKrwyj76heHXK5GvZBr5",
    object: {
      text: "head2",
      type: "Title",
      links: [
        "zb2wwnSAVmcugTtQxUgxkNbBns2FN68B1wtbV6yDkwCNrtmv3",
      ],
    },
  },
  {
    id: "zb2wwzAmpDuUdnFZvmYACLW6W8uAM6CjMUDA7xZkJKTFG5f39",
    object: {
      proof: {
        signature: "",
        type: "",
      },
      payload: {
        creatorsIds: [
        ],
        dataId: "zb2wwoT6tMZGU5q2NMzD8kYJPLRtZ769wzSHT6Jg3vc2fuvuW",
        message: "",
        timestamp: Date.now(),
        parentsIds: [
        ],
      },
    },
  },
]

  let pagePerspectives:any = [
    {
      perspective: {
        id: "zb2wwnSAVmcugTtQxUgxkNbBns2FN68B1wtbV6yDkwCNrtmv3",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorId: user.userId,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhXHeSJJjo9AQHqnKznWjhsx7xiSfQPC3ZHogycxNNQakQ",
          },
        },
        casID: "http:store:http://localhost:3100/uprtcl/1",
      },
      details: {
        headId: "zb2wwzAmpDuUdnFZvmYACLW6W8uAM6CjMUDA7xZkJKTFG5f39",
      },
      parentId: "zb2wwygjh4AhRqbNyVVVoydAyi4TbUfEgAwHaigkVTK5RgE1r",
    },
    {
      perspective: {
        id: "zb2wwqLCxrfmeQyZsbivGFfbg3eLpCo7MmQ9FNBTh7easN5hp",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorId: user.userId,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhZrjd8aQGchSG5aU8FLeGcmbbND1cwW2Rw4ZPG23Cjeo1",
          },
        },
        casID: "http:store:http://localhost:3100/uprtcl/1",
      },
      details: {
        headId: "zb2wws1KMpHijNYqN3Bg4Yy5WSayGAuGXyLMthKGfrWBfMzYP",
      },
      parentId: "zb2wwnSAVmcugTtQxUgxkNbBns2FN68B1wtbV6yDkwCNrtmv3",
    },
    {
      perspective: {
        id: "zb2wwr51zazEnWnNP99R7a5qyJXPMkS6NL5mCCZt5RjSFuFAd",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorId: user.userId,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhecybetWJy4z5WjsQQPbYRFREdraNnXzGTmDYhmuZU1V6",
          },
        },
        casID: "http:store:http://localhost:3100/uprtcl/1",
      },
      details: {
        headId: "zb2wwmAnQxUfn2WpTW55sHUqwAWAXa9D8og7EYWPLeC65YKgC",
      },
      parentId: "zb2wwqLCxrfmeQyZsbivGFfbg3eLpCo7MmQ9FNBTh7easN5hp",
    },
    {
      perspective: {
        id: "zb2wwvnYkgQbkMhDmDnunYMk97VPUPVw8WdWTrrTqhLzW1DSu",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorId: user.userId,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhZNU67tbxpDdzVpoevwrfd1G2e923jew6Jg2ZBVnxwYSx",
          },
        },
        casID: "http:store:http://localhost:3100/uprtcl/1",
      },
      details: {
        headId: "zb2wwnTXb4ACHnx3D2C5vEcLfxg8AtnxZRRdy4v5ZtLHufwN2",
      },
      parentId: "zb2wwr51zazEnWnNP99R7a5qyJXPMkS6NL5mCCZt5RjSFuFAd",
    },
    {
      perspective: {
        id: "zb2wwygjh4AhRqbNyVVVoydAyi4TbUfEgAwHaigkVTK5RgE1r",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorId: user.userId,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhfgy1fy23kcZdsPyhn86eMKw8iM8XUkKg4aXhxRAvM6he",
          },
        },
        casID: "http:store:http://localhost:3100/uprtcl/1",
      },
      details: {
        headId: "zb2wwkV2YqxnrbzLzancrVxorJJz1GR2B7HhNQXxsrLeKApUh",
      },
      parentId: "zb2wwhmRinUyisXA8RXXMonzWqDAGyMfEWZaahDPC51UiV6a8",
    },
  ]

  // Collect children for perspectives.
  // We know that the children of perspectives are their page or link nodes.
  pagePerspectives.forEach((persp:any) => {
    const perspHead = pageData.find(head => head.id === persp.details.headId);
    const perspData = pageData.find(data => data.id === perspHead?.object.payload?.dataId);

    persp.details.addedChildren = perspData?.object.links
  });

  const updates = [
    {
      id: "zb2wwhmRinUyisXA8RXXMonzWqDAGyMfEWZaahDPC51UiV6a8",
      details: {
        headId: "zb2wwmRF9Rnz4qZhFbxbN4anHr5wt5MSMETqGj6hKEkv6Scdv",
        addedChildren: pagePerspectives.map((p:any) => p.perspective.id)
      },
    },
  ]

  return { pageData, pagePerspectives, updates }
}