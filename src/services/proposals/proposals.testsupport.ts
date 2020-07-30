import request from 'supertest';
import { createApp } from '../../server';
import { PostResult, GetResult } from '../../utils';
import { Proposal } from '../uprtcl/types';

export const createProposal = async (
	fromPerspectiveId: string,
	toPerspectiveId: string,
	jwt: string
): Promise<string> => {
	const router = await createApp();
	const post = await request(router)
		.post('/uprtcl/1/proposal')
		.send({
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
	
	const result: any = get.text;		

	return JSON.parse(get.text);	
};