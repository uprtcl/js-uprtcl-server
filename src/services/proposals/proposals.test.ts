import {
  toBeValidCid,
  ERROR,
  NOT_AUTHORIZED_MSG,
  SUCCESS,
  PostResult,
} from '../../utils';
import { PermissionType } from '../uprtcl/types';

// Test support
import { createUser } from '../user/user.testsupport';

import { addPermission } from '../access/access.testsupport';

import {
  createProposal,
  getProposal,
  getProposalsToPerspective,
  createUpdateRequest,
  addUpdatesToProposal,
  declineProposal,
  rejectProposal,
  acceptProposal,
} from './proposals.testsupport';

import {
  createPerspective,
  createCommitAndData,
  updatePerspective,
  getPerspective,
  getPerspectiveDetails,
} from '../uprtcl/uprtcl.testsupport';
import { NewPerspective } from '../uprtcl/types';

describe('Testing proposals controller, service and repo', () => {
  expect.extend({ toBeValidCid });

  // Mock data
  let user1: any = {};
  let user2: any = {};
  let commit1Id: string = '';
  let commit2Id: string = '';
  let commit3Id: string = '';
  let commit5Id: string = '';
  let toPerspectiveId: string = '';
  let fromPerspectiveId: string = '';
  let thirdPerspectiveId: string = '';
  let proposalUid: string = '';
  let proposal2Uid: string = '';
  let proposal3Uid: string = '';

  /**
   * CRUD create
   */

  it('should create a proposal', async () => {
    user1 = await createUser('seed1');
    user2 = await createUser('seed2');

    commit1Id = await createCommitAndData('text 123456', false, user1.jwt);
    toPerspectiveId = await createPerspective(
      user1.userId,
      846851,
      'context',
      user1.jwt,
      commit1Id
    );

    commit2Id = await createCommitAndData('text 12345', false, user1.jwt);
    fromPerspectiveId = await createPerspective(
      user1.userId,
      118948,
      'context',
      user1.jwt,
      commit2Id
    );

    const newPersp1 = await getPerspective(toPerspectiveId, user1.jwt);
    const newPersp1Details = await getPerspectiveDetails(
      toPerspectiveId,
      user1.jwt
    );
    const newPersp1Obj: NewPerspective = {
      perspective: newPersp1.data,
      details: newPersp1Details.data,
    };

    const newPersp2 = await getPerspective(fromPerspectiveId, user1.jwt);
    const newPersp2Details = await getPerspectiveDetails(
      fromPerspectiveId,
      user1.jwt
    );
    const newPersp2Obj: NewPerspective = {
      perspective: newPersp2.data,
      details: newPersp2Details.data,
    };

    const proposal = await createProposal(
      fromPerspectiveId,
      toPerspectiveId,
      commit2Id,
      commit1Id,
      [],
      [newPersp1Obj, newPersp2Obj],
      user2.jwt
    );

    const { result, elementIds } = JSON.parse(proposal);
    proposalUid = elementIds[0];

    expect(result).toEqual(SUCCESS);
  });

  /**
   * CRUD read
   */

  it('should get a proposal', async () => {
    const proposal = await getProposal(proposalUid, user1.jwt);

    expect(proposal.result).toEqual(SUCCESS);
  });

  it('should return not found for non-existent proposalId', async () => {
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

    commit3Id = await createCommitAndData('text 4745729', false, user1.jwt);

    // Update perspective to the new change

    await updatePerspective(
      fromPerspectiveId,
      { headId: commit3Id },
      user1.jwt
    );

    // Commit a new change to the toPerspective

    const commit4Id = await createCommitAndData(
      'text 658484',
      false,
      user1.jwt
    );

    // Update perspective to the new change

    await updatePerspective(toPerspectiveId, { headId: commit4Id }, user1.jwt);

    // Create a third perspective
    const commit5Id = await createCommitAndData(
      'text 999999',
      false,
      user1.jwt
    );
    thirdPerspectiveId = await createPerspective(
      user1.userId,
      79878,
      'context',
      user1.jwt,
      commit5Id
    );

    // Create update requests

    const update1 = await createUpdateRequest(
      fromPerspectiveId,
      fromPerspectiveId,
      commit2Id,
      commit3Id
    );
    const update2 = await createUpdateRequest(
      fromPerspectiveId,
      toPerspectiveId,
      commit1Id,
      commit4Id
    );
    const update3 = await createUpdateRequest(
      fromPerspectiveId,
      thirdPerspectiveId,
      '',
      commit5Id
    );

    const updates = await addUpdatesToProposal(
      [update1, update2, update3],
      proposalUid,
      user2.jwt
    );
    expect(updates.result).toEqual(SUCCESS);
  });

  // Test the decline of a proposal

  it('should decline a proposal', async () => {
    const declinedProposal = await declineProposal(proposalUid, user2.jwt);
    expect(declinedProposal.result).toEqual(SUCCESS);
  });

  it('should throw error if not authorized to decline', async () => {
    const declinedProposal = await declineProposal(proposalUid, user1.jwt);
    expect(declinedProposal.result).toEqual(ERROR);
  });

  it('should throw error if duplicated decline action is performed', async () => {
    const declinedProposal = await declineProposal(proposalUid, user2.jwt);
    expect(declinedProposal.result).toEqual(ERROR);
  });

  it('DECLINE: should throw error if proposal not found', async () => {
    const randomUid = '0x546464';
    const declinedProposal = await declineProposal(randomUid, user2.jwt);
    expect(declinedProposal.result).toEqual(ERROR);
  });

  // // Test a proposal rejection

  it('should not allow to make a reject operation to non open proposals', async () => {
    // User1 is the owner of the perspectives

    const rejectedProposal = await rejectProposal(proposalUid, user1.jwt);
    expect(rejectedProposal.result).toEqual(ERROR);
  });

  it('should not allow to reject a proposal with no permissions', async () => {
    // User2 created the proposal

    const rejectedProposal = await rejectProposal(proposalUid, user2.jwt);
    expect(rejectedProposal.result).toEqual(ERROR);
  });

  it('should unauthorized a proposal with no updates', async () => {
    commit5Id = await createCommitAndData('epic text 555', false, user1.jwt);
    const commit6Id = await createCommitAndData(
      'epic text 666',
      false,
      user2.jwt
    );

    const proposal = await createProposal(
      thirdPerspectiveId, // fromPerspective
      fromPerspectiveId, // new toPerspective
      commit6Id,
      commit5Id,
      [],
      [],
      user2.jwt
    );

    const { elementIds } = JSON.parse(proposal);
    proposal2Uid = elementIds[0];

    const rejectedProposal = await rejectProposal(proposal2Uid, user1.jwt);
    expect(rejectedProposal.result).toEqual(ERROR);
  });

  it('should throw error if permissions are not enough to reject a proposal', async () => {
    //Commit a new change to the fromPerspective

    const commit7Id = await createCommitAndData('text 777', false, user1.jwt);

    // Update perspective to the new change

    await updatePerspective(
      fromPerspectiveId,
      { headId: commit7Id },
      user1.jwt
    );

    // Commit a new change to the toPerspective

    const commit8Id = await createCommitAndData('text 888', false, user1.jwt);

    // Update perspective to the new change

    await updatePerspective(
      thirdPerspectiveId,
      { headId: commit8Id },
      user1.jwt
    );

    // Create a fourth perspective

    const commit9Id = await createCommitAndData('text 999', false, user2.jwt);
    const fourthPerspectiveId = await createPerspective(
      user2.userId,
      999,
      'context',
      user2.jwt,
      commit9Id
    );

    const update1 = await createUpdateRequest(
      thirdPerspectiveId,
      fromPerspectiveId,
      commit3Id,
      commit7Id
    );
    const update2 = await createUpdateRequest(
      thirdPerspectiveId,
      thirdPerspectiveId,
      commit5Id,
      commit8Id
    );
    const update3 = await createUpdateRequest(
      thirdPerspectiveId,
      fourthPerspectiveId,
      '',
      commit9Id
    );

    const updates = await addUpdatesToProposal(
      [update1, update2, update3],
      proposal2Uid,
      user2.jwt
    );

    await addPermission(
      thirdPerspectiveId,
      user2.userId,
      PermissionType.Admin,
      user1.jwt
    );

    // Use the new created proposal
    const rejectedProposal = await rejectProposal(proposal2Uid, user2.jwt);
    expect(rejectedProposal.result).toEqual(ERROR);
  });

  it('should reject a proposal', async () => {
    await addPermission(
      fromPerspectiveId,
      user2.userId,
      PermissionType.Admin,
      user1.jwt
    );

    const rejectedProposal = await rejectProposal(proposal2Uid, user2.jwt);
    expect(rejectedProposal.result).toEqual(SUCCESS);
  });

  /**
   * CRUD read
   */

  // Get a proposal with updates
  it('should get a proposal with updates', async () => {
    const proposal = await getProposal(proposalUid, user1.jwt);
    expect(proposal.result).toEqual(SUCCESS);
  });

  /**
   * CRUD read: get proposals from perspective
   */

  it('should filter OPEN and EXECUTED proposals pointing to one perspective', async () => {
    const proposalIds = await getProposalsToPerspective(
      toPerspectiveId,
      user1.jwt
    );

    // Will not find an open or executed proposal and will return not found error.
    const { data, result } = proposalIds;
    expect(data).toHaveLength(0);
    expect(result).toEqual(SUCCESS);
  });

  it('should return empty data if no proposals are found for perspective', async () => {
    const proposalIds = await getProposalsToPerspective(
      thirdPerspectiveId,
      user1.jwt
    );

    const { data, result } = proposalIds;
    expect(data).toHaveLength(0);
    expect(result).toEqual(SUCCESS);
  });

  it('should get one "OPEN" or "EXECUTED" proposal per perspective', async () => {
    // Create a third proposal
    // User 2 creates the third proposal
    proposal3Uid = await createProposal(
      thirdPerspectiveId, // fromPerspective
      toPerspectiveId, // new toPerspective
      commit3Id,
      commit5Id,
      [],
      [],
      user2.jwt
    );

    const proposalIds = await getProposalsToPerspective(
      toPerspectiveId,
      user1.jwt
    );

    expect(proposalIds.result).toEqual(SUCCESS);
  });

  it('should unauthorize the user when accepting an "OPEN" proposal', async () => {
    const accept = await acceptProposal(proposalUid, user2.jwt);
    expect(accept.result).toEqual(ERROR);
  });

  it('should accept the "OPEN" proposal', async () => {
    const accept = await acceptProposal(proposalUid, user1.jwt);
    expect(accept.result).toEqual(SUCCESS);
  });
});
