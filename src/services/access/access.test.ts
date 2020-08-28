import { toBeValidCid, ERROR, SUCCESS } from '../../utils';
import {     
    delegatePermissionsTo,
    finDelegatedChildNodes
} from './access.testsupport';
import { createUser } from '../user/user.testsupport';
import { createCommitAndData, 
         createPerspective         
       } from '../uprtcl/uprtcl.testsupport';

describe('create perspectives with its parentIds', () => {
    expect.extend({ toBeValidCid });  
    
    const creatorId = 'did:method:12345';    

    let user1:any = {};

    let perspectiveA = '';
    let perspectiveB = '';
    let perspectiveC1 = '';        
   
    it('should update all finDelegatedTo of all children', async () => {
        user1 = await createUser('seed1');        

        const commitA = await createCommitAndData('perspective A', user1.jwt);
        perspectiveA = await createPerspective(
            creatorId,
            454545,
            user1.jwt,
            commitA
        );

        const commitB = await createCommitAndData('perspective B', user1.jwt);
        perspectiveB = await createPerspective(
            creatorId,
            846851,
            user1.jwt,
            commitB,
            perspectiveA
        );

        const commitC1 = await createCommitAndData('perspective C1', user1.jwt);
        perspectiveC1 = await createPerspective(
            creatorId,
            458765,
            user1.jwt,
            commitC1,
            perspectiveB
        ); 

        const commitC2 = await createCommitAndData('perspective C2', user1.jwt);
        const perspectiveC2 = await createPerspective(
            creatorId,
            123456,
            user1.jwt,
            commitC2,
            perspectiveB
        ); 

        const commitD1 = await createCommitAndData('perspective D1', user1.jwt);
        const perspectiveD1 = await createPerspective(
            creatorId,
            789456,
            user1.jwt,
            commitD1,
            perspectiveC1
        ); 

        // Checks all finDelegatedTo of perspectiveB children.
        let childrenB = await finDelegatedChildNodes(perspectiveB);                        

        expect(Array.from(new Set(childrenB))).toHaveLength(1);
        expect(Array.from(new Set(childrenB))).toEqual([perspectiveA]);

        // Removes perspectiveA from parentId of perspectiveB
        const delegateToB = await delegatePermissionsTo(
            perspectiveB, 
            false, 
            undefined,
            user1.jwt
        );
        expect(delegateToB.result).toEqual(SUCCESS);

        // Checks all finDelegatedTo of perspectiveB children.
        childrenB = await finDelegatedChildNodes(perspectiveB);                        

        expect(Array.from(new Set(childrenB))).toHaveLength(1);
        expect(Array.from(new Set(childrenB))).toEqual([perspectiveB]);

        // Returns perspectiveA as parentId of perspectiveB
        const delegateToA = await delegatePermissionsTo(
            perspectiveB,
            true, 
            perspectiveA, 
            user1.jwt
        );        

        expect(delegateToA.result).toEqual(SUCCESS);        

        childrenB = await finDelegatedChildNodes(perspectiveB);                        

        expect(Array.from(new Set(childrenB))).toHaveLength(1);
        expect(Array.from(new Set(childrenB))).toEqual([perspectiveA]);
    });    
});