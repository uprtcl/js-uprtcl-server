import request from 'supertest';
import { createApp } from '../../server';
import { PostResult, GetResult } from '../../utils';
import { Proposal, UpdateRequest } from '../uprtcl/types';

export const createProposal = async (
	creatorId: string,
	fromPerspectiveId: string,
	toPerspectiveId: string,
	fromHeadId: string,
	toHeadId: string,
	jwt: string
): Promise<string> => {
	const router = await createApp();
	const post = await request(router)
		.post('/uprtcl/1/proposal')
		.send({
			"creatorId": creatorId,
			"fromPerspectiveId": fromPerspectiveId,
			"toPerspectiveId": toPerspectiveId,
			"fromHeadId": fromHeadId,
			"toHeadId": toHeadId
		}).set('Authorization', jwt ? `Bearer ${jwt}` : '');
	
	let result: any = post.text;  	

  	return result;
};

export const getProposal = async (
	proposalId: string,
	jwt: string
): Promise<GetResult<Proposal>> => {
	const router = await createApp();
	const get = await request(router)
		.get(`/uprtcl/1/proposal/${proposalId}`)
		.set('Authorization', jwt ? `Bearer ${jwt}` : '');

	return JSON.parse(get.text);	
};

export const getProposalsToPerspective = async (
	perspectiveId: string,
	jwt: string
): Promise<GetResult<string[]>> => {
	const router = await createApp();
	const get = await request(router)
		.get(`/uprtcl/1/persp/${perspectiveId}/proposals`)
		.set('Authorization', jwt ? `Bearer ${jwt}` : '');    
	
	return JSON.parse(get.text);
};

export const createUpdateRequest = async (
	perspectiveId: string,
	oldHeadId: string,
	newHeadId: string
): Promise<UpdateRequest> => {
	const update: UpdateRequest = {
		oldHeadId: (oldHeadId !== '') ? oldHeadId : undefined,
		perspectiveId: perspectiveId,
		newHeadId: newHeadId
	};

	return update;
};

export const addUpdatesToProposal = async (
	updates: UpdateRequest[],
	proposalUid: string,
	jwt: string
): Promise<PostResult> => {
	const router = await createApp();
	const put = await request(router)
		 .put(`/uprtcl/1/proposal/${proposalUid}`)
		 .send({ "updates": updates })
		 .set('Authorization', jwt ? `Bearer ${jwt}` : '');

	return JSON.parse(put.text);
};

export const declineProposal = async (
	proposalUid: string,
	jwt: string
): Promise<PostResult> => {	
	const router = await createApp();
	const put = await request(router)
		 .put(`/uprtcl/1/proposal/${proposalUid}/decline`)
		 .set('Authorization', jwt ? `Bearer ${jwt}` : '');		 	

	return JSON.parse(put.text);
};

export const rejectProposal = async (
	proposalUid: string,
	jwt: string
): Promise<PostResult> => {	
	const router = await createApp();
	const put = await request(router)
		 .put(`/uprtcl/1/proposal/${proposalUid}/reject`)
		 .set('Authorization', jwt ? `Bearer ${jwt}` : '');		 	

	return JSON.parse(put.text);
};
