/**
 * Includes:
 * -> Home space
 *  -> Linked thoughts space
 *    -> Private
 *      -> An untitled page created on Private
 *    -> Blog
 */
export const createHomeSpace = (user: string) => {
  return {
    data: [
      {
        id: "zb2wwmih6X9wVG8eGPHsKcSQZDmHrpRR7Jr2tY489DQUayq3v",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: 0,
            context: `${user}.home`,
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
      {
        id: "zb2wwnTmtTPf9Q9qMUWkmEXMfEHK8YPCzQD82fTkhnv1izrBD",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2wwrZbtVv6Pb5LN2h85HLwuiT6gDR5iwr5q6rF8EPjUFbSK",
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
      {
        id: "zb2wwxorGthbSLv77G2He7zAwH4mL47vdPWNEY42GyGy7LsRt",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2wwtfg8NqwUY5teuoMZn9SdYXZAJDRAXFiyK8ycJgbMXzvN",
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
      {
        id: "zb2wwwjGz9v4yo7RoskJXsBGnEEzwvcH5vmon3EhWpzYHpEig",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2wwxWvb6WRkcTFmqCET2JyjrrWyBcPnhkypDfHdBw8bmr9d",
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
      {
        id: "zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2wwkWRG6Q8WVXS8oa2g3H9kG5UDyPb34CvAZFXGyc3XxKRd",
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
      {
        id: "zb2wwjL29QcxYvSdn2pvp7DknUamsaxGwi9NyrXUH1bNuNAVX",
        object: {
          linkedThoughts: "zb2wwnTmtTPf9Q9qMUWkmEXMfEHK8YPCzQD82fTkhnv1izrBD",
        },
      },
      {
        id: "zb2wwx7u3rKjxb7mU5RW5suWLHsG4b9Pn7u4DYY5XjmcPASAB",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwjL29QcxYvSdn2pvp7DknUamsaxGwi9NyrXUH1bNuNAVX",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
            ],
          },
        },
      },
      {
        id: "zb2wwii16DhDYrqzCoMyhRuRZBVPk3aseJqmPfbyBm5Ypi88s",
        object: {
          sections: [
            "zb2wwxorGthbSLv77G2He7zAwH4mL47vdPWNEY42GyGy7LsRt",
            "zb2wwwjGz9v4yo7RoskJXsBGnEEzwvcH5vmon3EhWpzYHpEig",
          ],
        },
      },
      {
        id: "zb2wwiQKse9J2jZMWSSzpiwJMXsdUjaKhpdPv2yzJqCJGLovG",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwii16DhDYrqzCoMyhRuRZBVPk3aseJqmPfbyBm5Ypi88s",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
            ],
          },
        },
      },
      {
        id: "zb2wwiK6nVzzNqMN7r2qpUUsk7Pg6JLr1ZarCkmTD4XiBQicv",
        object: {
          title: "Private",
          pages: [
            "zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh",
          ],
        },
      },
      {
        id: "zb2wwhtauLQcCHiExkzLK2PyAhUxiQwenbNS4aewYbTa1cJ9X",
        object: {
          title: "Blog",
          pages: [
          ],
        },
      },
      {
        id: "zb2wwwTNfo9TSCXGjEnK9pyaTRxxjwKNE69vccVfnEAJ3bUcg",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwiK6nVzzNqMN7r2qpUUsk7Pg6JLr1ZarCkmTD4XiBQicv",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
            ],
          },
        },
      },
      {
        id: "zb2wwvy7WmJhNVMFivVu7REyz8vDN3yNteFmR7gZFaCm8QW6R",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwhtauLQcCHiExkzLK2PyAhUxiQwenbNS4aewYbTa1cJ9X",
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
        id: "zb2wwhw2SVcyoQyrM7p3MNMCSt4ewjStrNpZTiU5Ug3PJcQ3U",
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
    ],
    perspectives: [
      {
        perspective: {
          id: "zb2wwmih6X9wVG8eGPHsKcSQZDmHrpRR7Jr2tY489DQUayq3v",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: `${user}.home`,
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwmih6X9wVG8eGPHsKcSQZDmHrpRR7Jr2tY489DQUayq3v",
          details: {
            headId: "zb2wwx7u3rKjxb7mU5RW5suWLHsG4b9Pn7u4DYY5XjmcPASAB",
          },
          linkChanges: {
            children: {
              added: [
                "zb2wwnTmtTPf9Q9qMUWkmEXMfEHK8YPCzQD82fTkhnv1izrBD",
              ],
              removed: [
              ],
            },
          },
        },
      },
      {
        perspective: {
          id: "zb2wwnTmtTPf9Q9qMUWkmEXMfEHK8YPCzQD82fTkhnv1izrBD",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2wwrZbtVv6Pb5LN2h85HLwuiT6gDR5iwr5q6rF8EPjUFbSK",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwnTmtTPf9Q9qMUWkmEXMfEHK8YPCzQD82fTkhnv1izrBD",
          details: {
            headId: "zb2wwiQKse9J2jZMWSSzpiwJMXsdUjaKhpdPv2yzJqCJGLovG",
            guardianId: "zb2wwmih6X9wVG8eGPHsKcSQZDmHrpRR7Jr2tY489DQUayq3v",
          },
          linkChanges: {
            children: {
              added: [
                "zb2wwxorGthbSLv77G2He7zAwH4mL47vdPWNEY42GyGy7LsRt",
                "zb2wwwjGz9v4yo7RoskJXsBGnEEzwvcH5vmon3EhWpzYHpEig",
              ],
              removed: [
              ],
            },
          },
        },
      },
      {
        perspective: {
          id: "zb2wwxorGthbSLv77G2He7zAwH4mL47vdPWNEY42GyGy7LsRt",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2wwtfg8NqwUY5teuoMZn9SdYXZAJDRAXFiyK8ycJgbMXzvN",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwxorGthbSLv77G2He7zAwH4mL47vdPWNEY42GyGy7LsRt",
          details: {
            headId: "zb2wwwTNfo9TSCXGjEnK9pyaTRxxjwKNE69vccVfnEAJ3bUcg",
            guardianId: "zb2wwnTmtTPf9Q9qMUWkmEXMfEHK8YPCzQD82fTkhnv1izrBD",
          },
          linkChanges: {
            children: {
              added: [
                "zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh",
              ],
              removed: [
              ],
            },
          },
        },
      },
      {
        perspective: {
          id: "zb2wwwjGz9v4yo7RoskJXsBGnEEzwvcH5vmon3EhWpzYHpEig",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2wwxWvb6WRkcTFmqCET2JyjrrWyBcPnhkypDfHdBw8bmr9d",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwwjGz9v4yo7RoskJXsBGnEEzwvcH5vmon3EhWpzYHpEig",
          details: {
            headId: "zb2wwvy7WmJhNVMFivVu7REyz8vDN3yNteFmR7gZFaCm8QW6R",
            guardianId: "zb2wwnTmtTPf9Q9qMUWkmEXMfEHK8YPCzQD82fTkhnv1izrBD",
          },
          linkChanges: {
            children: {
              added: [
              ],
              removed: [
              ],
            },
          },
        },
      },
      {
        perspective: {
          id: "zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2wwkWRG6Q8WVXS8oa2g3H9kG5UDyPb34CvAZFXGyc3XxKRd",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh",
          details: {
            headId: "zb2wwhw2SVcyoQyrM7p3MNMCSt4ewjStrNpZTiU5Ug3PJcQ3U",
            guardianId: "zb2wwxorGthbSLv77G2He7zAwH4mL47vdPWNEY42GyGy7LsRt",
          },
          linkChanges: {
            children: {
              added: [
              ],
              removed: [
              ],
            },
          },
        },
      },
    ]
  }
}

export const createHerarchichalScenario = (user: string) => {
  return {
    data: [
      {
        id: "zb2wwkQeeoundFws2tvLtaC3RzAKvqn73eLXu2nKXNST5eUZq",
        object: {
          text: "Head1",
          type: "Title",
          links: [
            "zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo",
          ],
        },
      },
      {
        id: "zb2wwvWTcsvFd3pK5qpj7pd7fLBUkjRQz9EnSyyV9gjyHs1gK",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwkQeeoundFws2tvLtaC3RzAKvqn73eLXu2nKXNST5eUZq",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
            ],
          },
        },
      },
      {
        id: "zb2wws8bKmpB269Bfg8XgwzH5iit2BQovugoUrqHyvJbheKxU",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwkQeeoundFws2tvLtaC3RzAKvqn73eLXu2nKXNST5eUZq",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
              "zb2wwhw2SVcyoQyrM7p3MNMCSt4ewjStrNpZTiU5Ug3PJcQ3U",
            ],
          },
        },
      },
      {
        id: "zb2wwvtnUmq8H7ejjmf9HVHAVSWFpeSj65FKvAX7ZKdQ8mSLR",
        object: {
          text: "head2",
          type: "Title",
          links: [
            "zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q",
          ],
        },
      },
      {
        id: "zb2wwnHxDiNBGUoDhegnkbuToE9BC2NPZZgdDwGXs9jjk6qdR",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwvtnUmq8H7ejjmf9HVHAVSWFpeSj65FKvAX7ZKdQ8mSLR",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
            ],
          },
        },
      },
      {
        id: "zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhZZ4L82DVaG36xARJQrFTP3vH3HesXp5hhZixw6gHkezp",
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
      {
        id: "zb2www5RSXJEPbfDafWkcUYu5J9rhRzt5UWP8gZGm7bLwvWA3",
        object: {
          text: "head3",
          type: "Title",
          links: [
            "zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj",
          ],
        },
      },
      {
        id: "zb2wwqXVV1yoasQMQKmCV3vhgC6bfTVJGGG6Dq6ZhpPur42kR",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2www5RSXJEPbfDafWkcUYu5J9rhRzt5UWP8gZGm7bLwvWA3",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
            ],
          },
        },
      },
      {
        id: "zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhZMXu6xCuEJG2Pc2SooWASLJGYNKkyZvU8qEb2ZeQCUsc",
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
      {
        id: "zb2wwrvX9ywbAQNJ4zbBhsKoeJ4jxNSCPZXp6Upe8rr9G5fDx",
        object: {
          text: "head4",
          type: "Title",
          links: [
            "zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ",
          ],
        },
      },
      {
        id: "zb2wwsfq53SWY5U6cpZLGSRu8mERFvroKm7kXngg2o8ZfGwkb",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwrvX9ywbAQNJ4zbBhsKoeJ4jxNSCPZXp6Upe8rr9G5fDx",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
            ],
          },
        },
      },
      {
        id: "zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhan8q7CNLJAt17drzN13SyiMhkZ3PwcnLVF9djCdRUemN",
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
      {
        id: "zb2wwwZRNrKUUikvNmCmvRa35v4E8etBHnG5FHkFk53bCff2D",
        object: {
          text: "head5",
          type: "Title",
          links: [
            "zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN",
          ],
        },
      },
      {
        id: "zb2wwu21yz1DPDzHxRQFB7sfa8cbgyxD8tjjhTy9tUePbwpTb",
        object: {
          proof: {
            signature: "",
            type: "",
          },
          payload: {
            creatorsIds: [
            ],
            dataId: "zb2wwwZRNrKUUikvNmCmvRa35v4E8etBHnG5FHkFk53bCff2D",
            message: "",
            timestamp: Date.now(),
            parentsIds: [
            ],
          },
        },
      },
      {
        id: "zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhbuMZUJurdTh1Y8CwAgqWfF9K95ZQxHTAnREDYwQKdaTM",
          },
          proof: {
            signature: "",
            type: "",
          },
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
        id: "zb2wwssub8Dot9mvJapHHMYANh6oN28wMR9wfHmmWQMDpFbNF",
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
        id: "zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN",
        object: {
          payload: {
            creatorId: user,
            remote: "http:evees-v1",
            path: "http://localhost:3100/uprtcl/1",
            timestamp: Date.now(),
            context: "zb2rhcB1ZgZhkCmqgyUk8mm2uTU8sxbZNCAQPwTxEoozi6JFx",
          },
          proof: {
            signature: "",
            type: "",
          },
        },
      },
    ],
    perspectives: [
      {
        perspective: {
          id: "zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2rhZZ4L82DVaG36xARJQrFTP3vH3HesXp5hhZixw6gHkezp",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo",
          details: {
            headId: "zb2wwnHxDiNBGUoDhegnkbuToE9BC2NPZZgdDwGXs9jjk6qdR",
            guardianId: "zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh",
          },
          linkChanges: {
            children: {
              added: [
                "zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q",
              ],
              removed: [
              ],
            },
          },
        },
      },
      {
        perspective: {
          id: "zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2rhZMXu6xCuEJG2Pc2SooWASLJGYNKkyZvU8qEb2ZeQCUsc",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q",
          details: {
            headId: "zb2wwqXVV1yoasQMQKmCV3vhgC6bfTVJGGG6Dq6ZhpPur42kR",
            guardianId: "zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo",
          },
          linkChanges: {
            children: {
              added: [
                "zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj",
              ],
              removed: [
              ],
            },
          },
        },
      },
      {
        perspective: {
          id: "zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2rhan8q7CNLJAt17drzN13SyiMhkZ3PwcnLVF9djCdRUemN",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj",
          details: {
            headId: "zb2wwsfq53SWY5U6cpZLGSRu8mERFvroKm7kXngg2o8ZfGwkb",
            guardianId: "zb2wwqHuJBN4zmXPokxrPSJxTGvj19Hxg9MMhaeZwaeiFuV6Q",
          },
          linkChanges: {
            children: {
              added: [
                "zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ",
              ],
              removed: [
              ],
            },
          },
        },
      },
      {
        perspective: {
          id: "zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2rhbuMZUJurdTh1Y8CwAgqWfF9K95ZQxHTAnREDYwQKdaTM",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ",
          details: {
            headId: "zb2wwu21yz1DPDzHxRQFB7sfa8cbgyxD8tjjhTy9tUePbwpTb",
            guardianId: "zb2wwpeFkaEyM8wmLVfitXCNDAxw6bBEAhqUycYixP3p1n5nj",
          },
          linkChanges: {
            children: {
              added: [
                "zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN",
              ],
              removed: [
              ],
            },
          },
        },
      },
      {
        perspective: {
          id: "zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN",
          object: {
            payload: {
              creatorId: user,
              remote: "http:evees-v1",
              path: "http://localhost:3100/uprtcl/1",
              timestamp: Date.now(),
              context: "zb2rhcB1ZgZhkCmqgyUk8mm2uTU8sxbZNCAQPwTxEoozi6JFx",
            },
            proof: {
              signature: "",
              type: "",
            },
          },
        },
        update: {
          perspectiveId: "zb2wws9eDm8qSdANbgjrs5kdf9VGHf4Fd3UvUQaTUiZKZfwWN",
          details: {
            headId: "zb2wwssub8Dot9mvJapHHMYANh6oN28wMR9wfHmmWQMDpFbNF",
            guardianId: "zb2wwvGpXT72Anq48hrrgKGpnZqSAQVhLC5yNjjcTFaja3vWQ",
          },
          linkChanges: {
            children: {
              added: [
              ],
              removed: [
              ],
            },
          },
        },
      },
    ],
    updates: [
      {
        perspectiveId: "zb2wwybSsom4FSJts2Rxj4hb81rGvRZeepo4dkV36NAEZ1Wqh",
        details: {
          headId: "zb2wws8bKmpB269Bfg8XgwzH5iit2BQovugoUrqHyvJbheKxU",
        },
        oldDetails: {
          headId: "zb2wwhw2SVcyoQyrM7p3MNMCSt4ewjStrNpZTiU5Ug3PJcQ3U",
          guardianId: "zb2wwxorGthbSLv77G2He7zAwH4mL47vdPWNEY42GyGy7LsRt",
          canUpdate: true,
        },
        linkChanges: {
          children: {
            added: [
              "zb2wwkZ2JbB5bhVxqA1zaZkyE42rPtuGDi89XVsRMjGdT3UGo",
            ],
            removed: [
            ],
          },
        },
      },
    ]
  }
}