import request from 'supertest';
import { createApp } from '../../server';
import { PostResult, GetResult } from '../../utils';
import { Proposal } from '../uprtcl/types';

export const createProposal = async (
	creatorId: string,
	fromPerspectiveId: string,
	toPerspectiveId: string,
	jwt: string
): Promise<string> => {
	const router = await createApp();
	const post = await request(router)
		.post('/uprtcl/1/proposal')
		.send({
			"creatorId": creatorId,
			"fromPerspectiveId": fromPerspectiveId,
			"toPerspectiveId": toPerspectiveId
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
): Promise<void> => {//<string[]> => {
	const router = await createApp();
	const get = await request(router)
		.get(`/uprtcl/1/persp/${perspectiveId}/proposals`)
		.set('Authorization', jwt ? `Bearer ${jwt}` : '');

	console.log(get.text);
}