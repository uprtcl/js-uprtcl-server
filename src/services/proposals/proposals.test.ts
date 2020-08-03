import { toBeValidCid, ERROR, NOT_AUTHORIZED_MSG, SUCCESS, PostResult } from '../../utils';
import { PermissionType } from '../access/access.schema';

// Test support
import { createUser } from '../user/user.testsupport';

import { 
  createProposal,
  getProposal,
  getProposalsToPerspective,
  createUpdateRequest,
  addUpdatesToProposal,
  declineProposal
} from './proposals.testsupport';

import {
  createPerspective,  
  createCommitAndData,
  updatePerspective
} from '../uprtcl/uprtcl.testsupport';


describe('Testing proposals controller, service and repo', () => {
    expect.extend({ toBeValidCid });

    // Mock data
    let user1: any = {};
    let user2: any = {};
    let commit1Id: string = '';
    let commit2Id: string = '';
    let toPerspectiveId: string = '';
    let fromPerspectiveId: string = '';    
    let proposalUid: string = '';


    /**
     * CRUD create
     */

    it('should create a proposal', async () => {  
      
      user1 = await createUser('seed1');   
      user2 = await createUser('seed2');

      commit1Id = await createCommitAndData('text 123456', user1.jwt);
      toPerspectiveId = await createPerspective(
        user1.userId,
        846851,
        user1.jwt,
        commit1Id
      );     

      commit2Id = await createCommitAndData('text 12345', user1.jwt);
      fromPerspectiveId = await createPerspective(
        user1.userId,
        118948,
        user1.jwt,
        commit2Id
      );               

      const proposal = await createProposal(user2.userId, 
                                            fromPerspectiveId, 
                                            toPerspectiveId,
                                            commit2Id, 
                                            commit1Id,
                                            user2.jwt);      
      const { result, elementIds } = JSON.parse(proposal);
      proposalUid = elementIds[0];

      expect(result).toEqual(SUCCESS);          
    });

    // /**
    //  * CRUD get
    //  */

    it('should get a proposal', async () => {      
      
      const proposal = await getProposal(proposalUid, user1.jwt);                

      expect(proposal.result).toEqual(SUCCESS);                 
    });

    it('should return not found for non-existent proposalId', async() => {
      const proposal = await getProposal('randomId', user1.jwt);      
      const { result, data } = proposal;

      expect(result).toEqual(ERROR);    
      expect(data).toBeNull(); 
    });

    /**
     * CRUD update
     */

    it('should add updates to the proposal', async () => {

      //Commit a new change to the fromPerspective

      const commit3Id = await createCommitAndData('text 4745729', user1.jwt);   

      // Update perspective to the new change

      await updatePerspective(
        fromPerspectiveId,
        { headId: commit3Id },
        user1.jwt
      );
      
      // Commit a new change to the toPerspective

      const commit4Id = await createCommitAndData('text 658484', user1.jwt);  

      // Update perspective to the new change  

      await updatePerspective(
        toPerspectiveId,
        { headId: commit4Id },
        user1.jwt
      ); 

      // Create a third perspective

      const commit5Id = await createCommitAndData('text 999999', user1.jwt);
      const thirdPerspectiveId = await createPerspective(
        user1.userId,
        79878,
        user1.jwt,
        commit5Id
      );     
           
      // Create update requests

      const update1 = await createUpdateRequest(fromPerspectiveId, commit2Id, commit3Id);
      const update2 = await createUpdateRequest(toPerspectiveId, commit1Id, commit4Id);
      const update3 = await createUpdateRequest(thirdPerspectiveId, '', commit5Id);
      
      const updates = await addUpdatesToProposal([update1, update2, update3], proposalUid, user1.jwt);    

      expect(updates.result).toEqual(SUCCESS);
       
    });

    // Test the decline of a proposal

    it('should decline a proposal', async() => {
      const declinedProposal = await declineProposal(proposalUid, user2.jwt);      

      expect(declinedProposal.result).toEqual(SUCCESS);
    });

    it('should throw error if not authorized to decline', async() => {
      const declinedProposal = await declineProposal(proposalUid, user1.jwt);            

      expect(declinedProposal.result).toEqual(ERROR);
    });

    it('should throw error if duplicated decline action is performed', async() => {
      const declinedProposal = await declineProposal(proposalUid, user2.jwt);      

      expect(declinedProposal.result).toEqual(ERROR);
    });

    it('DECLINE: should throw error if proposal not found', async() => {
      const randomUid = "0x546464";
      const declinedProposal = await declineProposal(randomUid, user2.jwt);            

      expect(declinedProposal.result).toEqual(ERROR);
    });


    /**
     * CRUD get proposals from perspective
     */

    // it('should call getProposalsToPerspective method', async () => {
    //   const proposalIds = await getProposalsToPerspective(fromPerspectiveId, user1.jwt);

    //   console.log(proposalIds);
    // });

    // /**
    //  * CRUD accept
    //  */

    // it('should call acceptProposal method', async () => {
    //   let acceptProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'acceptProposal');
      
    //   const router = await createApp();      
    //   const proposalId = 'randomId';

    //   await request(router)
    //     .put(`/uprtcl/1/proposal/${proposalId}/accept`)     
    //     .send({})
    //     .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

    //   expect(acceptProposal).toHaveBeenCalled(); 
    // });

    // /**
    //  * CRUD cancel
    //  */

    // it('should call cancelProposal method', async () => {
    //   let cancelProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'cancelProposal');
      
    //   const router = await createApp();      
    //   const proposalId = 'randomId';

    //   await request(router)
    //     .put(`/uprtcl/1/proposal/${proposalId}/cancel`)     
    //     .send({})
    //     .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

    //   expect(cancelProposal).toHaveBeenCalled(); 
    // });

    // /**
    //  * CRUD decline
    //  */

    // it('should call declineProposal', async () => {
    //   let declineProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'declineProposal');
      
    //   const router = await createApp();
    //   const proposalId = 'randomId';

    //   await request(router)
    //     .put(`/uprtcl/1/proposal/${proposalId}/decline`)     
    //     .send({})
    //     .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

    //   expect(declineProposal).toHaveBeenCalled(); 
    // });

 });