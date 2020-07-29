import { toBeValidCid, ERROR, NOT_AUTHORIZED_MSG, SUCCESS, PostResult } from '../../utils';

// Test support
import { createUser } from '../user/user.testsupport';
import { createProposal } from './proposals.testsupport';
import {
  createPerspective,  
  createCommitAndData,
} from '../uprtcl/uprtcl.testsupport';

describe('Testing controller, service and repo', () => {
    expect.extend({ toBeValidCid });

    // Mock data
    let user1: any = {};
    let creatorId = 'did:method:12345';
    let commit1Id: string = '';
    let commit2Id: string = '';
    let toPerspectiveId: string = '';
    let fromPerspectiveId: string = '';


    /**
     * CRUD create
     */

    it('should create a proposal', async () => {  
      
      user1 = await createUser('seed1');
      creatorId = 'did:method:12345';

      commit1Id = await createCommitAndData('text 123456', user1.jwt);
      toPerspectiveId = await createPerspective(
        creatorId,
        846851,
        user1.jwt,
        commit1Id
      );

      commit2Id = await createCommitAndData('text 12345', user1.jwt);
      fromPerspectiveId = await createPerspective(
        creatorId,
        118948,
        user1.jwt,
        commit2Id
      );          


      const proposal = await createProposal(fromPerspectiveId, toPerspectiveId, user1.jwt);

      const { result } = JSON.parse(proposal);

      expect(result).toEqual(SUCCESS);
      
    });

    it('should return error if creating a proposal without authentication', async() => {
      const proposal = await createProposal(fromPerspectiveId, toPerspectiveId, '');

      const { result } = JSON.parse(proposal);     

      expect(result).toEqual(ERROR);
    });

    /**
     * CRUD get
     */

    // it('should call getProposal method', async () => {
    //   let getProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'getProposal');
      
    //   const router = await createApp();      
    //   const proposalId = 'randomId';

    //   await request(router)
    //     .get(`/uprtcl/1/proposal/${proposalId}`)        
    //     .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

    //   expect(getProposal).toHaveBeenCalled(); 
    // });

    /**
     * CRUD get proposals from perspective
     */

    // it('should call getProposalsToPerspective method', async () => {
    //   let getProposalsToPerspective: SpyInstace = jest.spyOn(ProposalsService.prototype, 'getProposalsToPerspective');
      
    //   const router = await createApp();      
    //   const perspectiveId = 'randomId';

    //   await request(router)
    //     .get(`/uprctl/1/persp/${perspectiveId}/proposals`)        
    //     .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

    //   expect(getProposalsToPerspective).toHaveBeenCalled(); 
    // });

    // /**
    //  * CRUD update
    //  */

    // it('should call addUpdatesToProposal method', async () => {
    //   let addUpdatesToProposal: SpyInstace = jest.spyOn(ProposalsService.prototype, 'addUpdatesToProposal');
      
    //   const router = await createApp();      
    //   const proposalId = 'randomId';

    //   await request(router)
    //     .put(`/uprtcl/1/proposal/${proposalId}`)        
    //     .send({})
    //     .set('Authorization', user1.jwt ? `Bearer ${user1.jwt}` : '');

    //   expect(addUpdatesToProposal).toHaveBeenCalled(); 
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