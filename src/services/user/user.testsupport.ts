import request from 'supertest';
import { createApp } from '../../server';

var ethUtil = require('ethereumjs-util');
var Web3 = require('web3');

interface TestUser {
  userId: string;
  jwt: string;
}

const getJwtToken = async (
  userDid: string,
  privateKey: string
): Promise<string> => {
  const router = await createApp();
  const get = await request(router).get(`/uprtcl/1/user/${userDid}/nonce`);
  expect(get.status).toEqual(200);

  let nonce: string = JSON.parse(get.text).data;

  var data = `Login to Intercreativity \n\nnonce:${nonce}`;
  var message = '0x' + Buffer.from(data, 'utf8').toString('hex');
  var messageBuffer = ethUtil.toBuffer(message);
  var msgHash = ethUtil.hashPersonalMessage(messageBuffer);

  let ECDSAsignature = ethUtil.ecsign(msgHash, ethUtil.toBuffer(privateKey));
  let signature = ethUtil.bufferToHex(
    Buffer.concat([
      ECDSAsignature.r,
      ECDSAsignature.s,
      Uint8Array.from([ECDSAsignature.v]),
    ])
  );

  const put = await request(router)
    .put(`/uprtcl/1/user/${userDid}/authorize`)
    .send({ signature });
  expect(put.status).toEqual(200);

  return JSON.parse(put.text).data.jwt;
};

export const createUser = async (seed: string): Promise<TestUser> => {
  let web3 = new Web3();
  let account = web3.eth.accounts.create(seed);
  let userDid = account.address;

  let jwt: string = await getJwtToken(userDid, account.privateKey);
  console.log('[TEST] createUser', { userDid, jwt });
  
  return {
    userId: userDid,
    jwt: jwt,
  };
};
