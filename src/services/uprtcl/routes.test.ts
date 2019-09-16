import request from "supertest";
import promiseRequest from "request-promise";
import { router } from '../../server';
import CID from 'cids';
import { Perspective, DataDto, DataType, Commit, DocNodeType } from "./types";

jest.mock("request-promise");
(promiseRequest as any).mockImplementation(() => '{"features": []}');

interface ExtendedMatchers extends jest.Matchers<void> {
  toBeValidCid: () => object;
}

const createPerspective = async (creatorId: string, name: string, context: string, timestamp: number):Promise<string> => {
  
  const perspective: Perspective = {
    id: '',
    name: name,
    context: context,
    origin: '',
    creatorId: creatorId,
    timestamp: timestamp
  }

  const post = await request(router).post('/uprtcl/1/persp')
  .send(perspective);
  expect(post.status).toEqual(200);

  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

const updatePerspective = async (perspectiveId: string, headId: string):Promise<void> => {
  const put = await request(router).put(`/uprtcl/1/persp/${perspectiveId}?headId=${headId}`)
  .send();
  expect(put.status).toEqual(200);
}

const createCommit = async (
  creatorId: string, 
  timestamp: number, 
  message: string, 
  parentsIds: Array<string>, 
  dataId: string) : Promise<string> => {
  
  const commit: Commit = {
    id: '',
    creatorId: creatorId,
    timestamp: timestamp,
    message: message,
    parentsIds: parentsIds,
    dataId: dataId
  }

  const post = await request(router).post('/uprtcl/1/commit')
  .send(commit);
  expect(post.status).toEqual(200);
  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

const addKnownSources = async (
  elementId: string, 
  sources: Array<string>) : Promise<void> => {
  
  const post = await request(router).put(`/uprtcl/1/discovery/${elementId}`)
  .send(sources);
  expect(post.status).toEqual(200);
}

const getKnownSources = async (
  elementId: string) : Promise<Array<string>> => {
  
  const get = await request(router).get(`/uprtcl/1/discovery/${elementId}`);
  expect(get.status).toEqual(200);
  
  return JSON.parse(get.text).data;
}

const getOrigin = async (
  elementId: string) : Promise<string> => {
  
  const get = await request(router).get(`/uprtcl/1/discovery/you`);
  expect(get.status).toEqual(200);
  
  return JSON.parse(get.text).data;
}

const getPerspective = async (perspectiveId: string):Promise<Perspective> => {
  const get = await request(router).get(`/uprtcl/1/persp/${perspectiveId}`);
  expect(get.status).toEqual(200);
  
  return JSON.parse(get.text).data;
}

const getPerspectiveHead = async (perspectiveId: string):Promise<string> => {
  const get = await request(router).get(`/uprtcl/1/persp/${perspectiveId}/head`);
  expect(get.status).toEqual(200);
  
  return JSON.parse(get.text).data;
}

const getCommit = async (commitId: string):Promise<Commit> => {
  const get = await request(router).get(`/uprtcl/1/commit/${commitId}`);
  expect(get.status).toEqual(200);
  
  return JSON.parse(get.text).data;
}

const createText = async (text: string):Promise<string> => {
  const data = {
    id: '',
    text: text
  }

  const dataDto: DataDto = {
    id: '',
    jsonData: JSON.stringify(data),
    type: DataType.TEXT
  }

  const post = await request(router).post('/uprtcl/1/data')
  .send(dataDto);
  expect(post.status).toEqual(200);
  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

const createTextNode = async (text: string, links: string[]):Promise<string> => {
  const data = {
    id: '',
    text: text,
    links: links
  }

  const dataDto: DataDto = {
    id: '',
    jsonData: JSON.stringify(data),
    type: DataType.TEXT_NODE
  }

  const post = await request(router).post('/uprtcl/1/data')
  .send(dataDto);
  expect(post.status).toEqual(200);
  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

const createDocNode = async (text: string, doc_node_type: DocNodeType, links: string[]):Promise<string> => {
  const data = {
    id: '',
    text: text,
    doc_node_type: doc_node_type,
    links: links
  }

  const dataDto: DataDto = {
    id: '',
    jsonData: JSON.stringify(data),
    type: DataType.DOCUMENT_NODE
  }

  const post = await request(router).post('/uprtcl/1/data')
  .send(dataDto);
  expect(post.status).toEqual(200);
  let result: any = JSON.parse(post.text).elementIds[0];
  (expect(result) as unknown as ExtendedMatchers).toBeValidCid();

  return result;
}

const getData = async (dataId: string):Promise<any> => {
  const get = await request(router).get(`/uprtcl/1/data/${dataId}`);
  expect(get.status).toEqual(200);
  return JSON.parse(get.text).data;
}

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

  test("CRUD perspectives", async () => {
    const creatorId = 'did:method:12345';
    const name = 'test';
    const context = 'wikipedia.barack_obama';
    const timestamp = 1568027451547;

    let perspectiveId = await createPerspective(creatorId, name, context, timestamp);
    let perspectiveRead = await getPerspective(perspectiveId);
    
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
    let par1Id = await createText(text1); 
    let commit1Id = await createCommit(creatorId, timestamp, message, [], par1Id);

    await updatePerspective(perspectiveId, commit1Id);
    let perspectiveHeadRead = await getPerspectiveHead(perspectiveId);

    expect(perspectiveHeadRead).toEqual(commit1Id);

  });

  test("CRUD text data", async () => {
    let text = 'an example text';

    let dataId = await createText(text);
    let dataRead = await getData(dataId)
    
    expect(dataRead.id).toEqual(dataId);
    expect(dataRead.text).toEqual(text);
  });

  test("CRUD text node data", async () => {
    let text1 = 'a paragraph 1';
    let par1Id = await createText(text1);

    let text2 = 'a paragraph 2';
    let par2Id = await createText(text2);

    let text12 = 'a paragraph 1.2';
    let par12Id = await createText(text12);

    let subtitle1 = 'a subtitle 2';
    let sub1Id = await createTextNode(subtitle1, [par12Id]);

    let text3 = 'a title';
    let dataId = await createTextNode(text3, [par1Id, par2Id, sub1Id]);

    let dataRead = await getData(dataId)
    
    expect(dataRead.id).toEqual(dataId);
    expect(dataRead.text).toEqual(text3);
    expect(dataRead.links.length).toEqual(3);
    
    expect(dataRead.links[0].xid).toEqual(par1Id);
    expect(dataRead.links[0].text).toEqual(text1);

    expect(dataRead.links[1].xid).toEqual(par2Id);
    expect(dataRead.links[1].text).toEqual(text2);

    expect(dataRead.links[2].xid).toEqual(sub1Id);
    expect(dataRead.links[2].text).toEqual(subtitle1);
    
    expect(dataRead.links[2].links.length).toEqual(1);
    
    expect(dataRead.links[2].links[0].xid).toEqual(par12Id);
    expect(dataRead.links[2].links[0].text).toEqual(text12);
  });

  test("CRUD doc node data", async () => {

    let par1 = 'a doc parragraph 1';
    let par1Id = await createDocNode(par1, DocNodeType.paragraph, []);

    let par2 = 'a doc parragraph 2';
    let par2Id = await createDocNode(par2, DocNodeType.paragraph, []);

    let title1 = 'a doc title';
    let title1Id = await createDocNode(title1, DocNodeType.title, [par1Id, par2Id]);

    let dataRead = await getData(title1Id)
    
    expect(dataRead.id).toEqual(title1Id);
    expect(dataRead.text).toEqual(title1);
    expect(dataRead.doc_node_type).toEqual(DocNodeType.title);

    expect(dataRead.links.length).toEqual(2);
    
    expect(dataRead.links[0].xid).toEqual(par1Id);
    expect(dataRead.links[0].text).toEqual(par1);
    expect(dataRead.links[0].doc_node_type).toEqual(DocNodeType.paragraph);

    expect(dataRead.links[1].xid).toEqual(par2Id);
    expect(dataRead.links[1].text).toEqual(par2);
    expect(dataRead.links[1].doc_node_type).toEqual(DocNodeType.paragraph);
  });

  test("CRUD commits", async () => {
    const creatorId = 'did:method:12345';
    const message = 'commit message';
    const timestamp = 1568027451547;

    let text1 = 'a paragraph 1';
    let par1Id = await createText(text1); 

    let commit1Id = await createCommit(creatorId, timestamp, message, [], par1Id);
    let commitRead = await getCommit(commit1Id);
    
    expect(commitRead.id).toEqual(commit1Id);
    expect(commitRead.creatorId).toEqual(creatorId);
    expect(commitRead.timestamp).toEqual(timestamp);
    expect(commitRead.message).toEqual(message);
    expect(commitRead.dataId).toEqual(par1Id);
    expect(commitRead.parentsIds.length).toEqual(0);

    let par11Id = await createText('a paragraph 1 updated');
    
    let message2 = 'udpated text';

    let commit11Id = await createCommit(creatorId, timestamp, message2, [commit1Id], par11Id);
    let commit11Read = await getCommit(commit11Id);

    expect(commit11Read.id).toEqual(commit11Id);
    expect(commit11Read.creatorId).toEqual(creatorId);
    expect(commit11Read.timestamp).toEqual(timestamp);
    expect(commit11Read.message).toEqual(message2);
    expect(commit11Read.dataId).toEqual(par11Id);
    expect(commit11Read.parentsIds.length).toEqual(1);
    expect(commit11Read.parentsIds[0]).toEqual(commit1Id);

  });

  test("Discovery", async () => {
    let par1Id = await createText('a paragraph 1');

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

    let par2Id = await createText('a paragraph 2');
    
    let sourcesRead2 = await getKnownSources(par2Id);
    expect(sourcesRead2.length).toEqual(1);
    expect(sourcesRead2[0]).toEqual(origin);
  });
  
});