import { toBeValidCid, SUCCESS } from '../../utils';
import {     
    delegatePermissionsTo,
    finDelegatedChildNodes,
    getSecondLayerFinDelegatedTo,
    getAccessConfigOfElement
} from './access.testsupport';
import { createUser } from '../user/user.testsupport';
import {
    createCommitAndData, 
    createPerspective
} from '../uprtcl/uprtcl.testsupport';

describe('delegate behavior', () => {
    expect.extend({ toBeValidCid });  
    
    const creatorId = 'did:method:12345';    

    let user1:any = {};

    let perspectiveA = '';
    let perspectiveB = '';
    let perspectiveC1 = '';        
   
    it('should update all finDelegatedTo of all children and clone permissions', async () => {
        user1 = await createUser('seed1');        

        const commitA = await createCommitAndData('perspective A', false, user1.jwt);
        perspectiveA = await createPerspective(
            creatorId,
            454545,
            user1.jwt,
            commitA
        );

        const commitB = await createCommitAndData('perspective B', false, user1.jwt);
        perspectiveB = await createPerspective(
            creatorId,
            846851,
            user1.jwt,
            commitB,
            perspectiveA
        );

        const commitC1 = await createCommitAndData('perspective C1', false, user1.jwt);
        perspectiveC1 = await createPerspective(
            creatorId,
            458765,
            user1.jwt,
            commitC1,
            perspectiveB
        ); 

        const commitC2 = await createCommitAndData('perspective C2', false, user1.jwt);
        const perspectiveC2 = await createPerspective(
            creatorId,
            123456,
            user1.jwt,
            commitC2,
            perspectiveB
        ); 

        const commitD1 = await createCommitAndData('perspective D1', false, user1.jwt);
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

        /* 
           Check if permissions were properly cloned.
           In order to do that, check permissions of the 
           finDelegatedTo of the delegato element of 
           perspectiveB which is perspectiveA 
        */

        const finDelegatedTo = await getSecondLayerFinDelegatedTo(perspectiveB);
        
        // Which result should be the perspectiveA
        expect(finDelegatedTo).toEqual(perspectiveA);             

        /*
            Permissions after passing from 
            true to false must be equals to 
            the permissions of the finDelegateTo of
            the delegateTo of the current element.
            {
                currentElement: {
                    accessConfig: {
                        delegateTo: {
                            accessConfig: {
                                finDelegatedTo: {
                                    permissions: {
                                        uid
                                    }
                                }
                            }
                        }
                    }
                }
            }
        */

        // Then, get the permissions of the above obtained element
        const perspPermissions = await getAccessConfigOfElement(finDelegatedTo);          
                
        // From true to false
        const delegateToB = await delegatePermissionsTo(
            perspectiveB, 
            false, 
            undefined,
            user1.jwt
        );
        expect(delegateToB.result).toEqual(SUCCESS);    

        const perspBElementPermissions = await getAccessConfigOfElement(perspectiveB);     

        expect(perspBElementPermissions.permissionsUid).toEqual(perspPermissions.permissionsUid);

        // Checks all finDelegatedTo of perspectiveB children.
        childrenB = await finDelegatedChildNodes(perspectiveB);                        

        expect(Array.from(new Set(childrenB))).toHaveLength(1);
        expect(Array.from(new Set(childrenB))).toEqual([perspectiveB]);

        // From false to true
        const delegateToA = await delegatePermissionsTo(
            perspectiveB,
            true, 
            perspectiveA, 
            user1.jwt
        );        

        expect(delegateToA.result).toEqual(SUCCESS);        

        childrenB = await finDelegatedChildNodes(perspectiveB);                        
        
        // Checks child nodes
        expect(Array.from(new Set(childrenB))).toHaveLength(1);
        expect(Array.from(new Set(childrenB))).toEqual([perspectiveA]);

        //------------------------------

        // Different scenario of true to false and cloning.    
       const finDelegatedToD1 = await getSecondLayerFinDelegatedTo(perspectiveD1);
        
       // Which result should be the perspectiveA
       expect(finDelegatedToD1).toEqual(perspectiveA);             

       // Then, get the permissions of the above obtained element
       const rsD1Permissions = await getAccessConfigOfElement(finDelegatedToD1);          
                
       // From true to false
       const delegaToD1 = await delegatePermissionsTo(
           perspectiveD1, 
           false, 
           undefined,
           user1.jwt
       );
       expect(delegaToD1.result).toEqual(SUCCESS);    

       const D1Permissions = await getAccessConfigOfElement(perspectiveD1);     

       expect(D1Permissions.permissionsUid).toEqual(rsD1Permissions.permissionsUid);
    });    
});