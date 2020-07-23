/**
 * Unit tests required to assert controller and service functionality
 * -> Controller:
 *      -> Should test correct access to the route
 *          -> Expecting to call the correct function from the correct service.
 *          -> Expecting to receive a 200 status.
 *      -> Should test data validation
 *          -> Expects body or parameters to be correct.
 *          -> Expects to receive a 400 status.
 * -> Service:
 *      -> Should test correct user access.
 *          -> Expect to receive a denied access if user is not authorized.
 *          -> Expect to call next function.       
 *      -> Should test data validation
 *          -> Expects body to be correct. 
 *      -> Should test to recieve the correct data from repo.
 */

 /**
  * Integration tests to assert repository functionality
  *     -> Should be able to call repo from service.
  */
import SpyInstace = jest.SpyInstance;

import request from 'supertest';
import { createApp } from '../../server';

import { ProposalsService } from "../proposals/proposals.service";

// Mock user
let user1 = {
  userId: '0x8fc0FdF7965D19886094d432a718B4c9Bc0D4692',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiMHg4ZmMwZmRmNzk2NWQxOTg4NjA5NGQ0MzJhNzE4YjRjOWJjMGQ0NjkyIiwiaWF0IjoxNTk1NDY0NDMyLCJleHAiOjE1OTYxNTU2MzIsImlzcyI6IkMxX0VUSF9BVVRIIn0.1vihHTj4AwaDPUaSjP8lPFxJpV9dnjZNHxw4DAZ7OSc'
};

describe('routes', () => {

    /**
     * CRUD create
     */

    it('should call createProposal method', async () => {                                  
      let createProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'createProposal');

      const router = await createApp();      

      await request(router)
        .post('/uprtcl/1/proposal')
        .send({})
        .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

      expect(createProposal).toHaveBeenCalled();                   
    });

    /**
     * CRUD create and propose
     */
    
    it('should call createAndPropose method', async () => {
      let createAndPropose: SpyInstace = jest.spyOn(ProposalsService.prototype, 'createAndPropose');
      
      const router = await createApp();      

      await request(router)
        .post('/uprtcl/1/proposal/propose')
        .send({})
        .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

      expect(createAndPropose).toHaveBeenCalled();        
    });

    /**
     * CRUD get
     */

    it('should call getProposal method', async () => {
      let getProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'getProposal');
      
      const router = await createApp();      
      const proposalId = 'randomId';

      await request(router)
        .get(`/uprtcl/1/proposal/${proposalId}`)        
        .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

      expect(getProposal).toHaveBeenCalled(); 
    });

    /**
     * CRUD get proposals from perspective
     */

    it('should call getProposalsToPerspective method', async () => {
      let getProposalsToPerspective: SpyInstace = jest.spyOn(ProposalsService.prototype, 'getProposalsToPerspective');
      
      const router = await createApp();      
      const perspectiveId = 'randomId';

      await request(router)
        .get(`/uprctl/1/persp/${perspectiveId}/proposals`)        
        .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

      expect(getProposalsToPerspective).toHaveBeenCalled(); 
    });

    /**
     * CRUD update
     */

    it('should call addUpdatesToProposal method', async () => {
      let addUpdatesToProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'addUpdatesToProposal');
      
      const router = await createApp();      
      const proposalId = 'randomId';

      await request(router)
        .put(`/uprtcl/1/proposal/${proposalId}`)        
        .send({})
        .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

      expect(addUpdatesToProposal).toHaveBeenCalled(); 
    });

    /**
     * CRUD accept
     */

    it('should call acceptProposal method', async () => {
      let acceptProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'acceptProposal');
      
      const router = await createApp();      
      const proposalId = 'randomId';

      await request(router)
        .put(`/uprtcl/1/proposal/${proposalId}/accept`)     
        .send({})
        .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

      expect(acceptProposal).toHaveBeenCalled(); 
    });

    /**
     * CRUD cancel
     */

    it('should call cancelProposal method', async () => {
      let cancelProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'cancelProposal');
      
      const router = await createApp();      
      const proposalId = 'randomId';

      await request(router)
        .put(`/uprtcl/1/proposal/${proposalId}/cancel`)     
        .send({})
        .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

      expect(cancelProposal).toHaveBeenCalled(); 
    });

    /**
     * CRUD decline
     */

    it('should call declineProposal', async () => {
      let declineProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'declineProposal');
      
      const router = await createApp();
      const proposalId = 'randomId';

      await request(router)
        .put(`/uprtcl/1/proposal/${proposalId}/decline`)     
        .send({})
        .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

      expect(declineProposal).toHaveBeenCalled(); 
    });

 });

describe('service', () => {
  
    /**
     * CRUD create
     */

    it('should create a proposal', () => {

    });

    it('should ask for a logged in user', () => {

    });

    it('should receive a proposal from client.', () => {

    });
        
    it('should return error if a proposal is not received.', () => {

    });

    // add integration test for repo

    /**
     * CRUD create and propose
     */
    
    it('should create and propose a proposal', () => {

    });

    it('should ask for a logged in user', () => {

    });

    it('should receive a proposal and a new perspective data array from client.', () => {

    });
    
    it('should return error if neither a proposal or new perspective data is not received.', () => {

    });

    /**
     * CRUD get
     */

    it('should get a proposal',() => {
      // add integration test for repo
    });

    /**
     * CRUD get proposals from perspective
     */

    it('should get proposals of a perspective',() => {
      // add integration test for repo
    });


    /**
     * CRUD update
     */

    it('should update a proposal', () => {
      
    });

    it('should ask for a logged in user', () => {

    });

    it('should receive the updates array', () => {

    });

    it('should return error if the updates array is not received', () => {

    });

    // add integration test for repo

    /**
     * CRUD accept
     */

    it('should accept a proposal', () => {
      
    });

    it('should ask for a logged in user for accepting a proposal', () => {

    });

    // add integration test for repo

    /**
     * CRUD cancel
     */

    it('should cancel a proposal', () => {
      
    });

    it('should ask for a logged in user for cancellation', () => {

    });

    // add integration test for repo

    /**
     * CRUD decline
     */

    it('should decline a proposal', () => {
      
    });

    it('should ask for a logged in user for declines', () => {

    });

    // add integration test for repo
});

describe('repository', () => {

});