import { toBeValidCid, ERROR, SUCCESS } from '../../utils';
import { delegatePermissionsTo, setDelegateToFalse } from './access.testsupport';
import { createUser } from '../user/user.testsupport';
import { createCommitAndData, createPerspective } from '../uprtcl/uprtcl.testsupport';

describe('Testing access controller, service and repo', () => {
    expect.extend({ toBeValidCid });  
    
    const creatorId = 'did:method:12345';
    const creatorId2 = 'did:method:123456';

    let user1:any = {};
    let user2:any = {};

    let perspectiveA = '';
    let perspectiveB = '';
    let perspectiveC1 = '';
    let perspectiveC2 = '';
    let perspectiveD1 = '';

    it('changes `delegate` property to true in accessConfig', async () => {
        user1 = await createUser('seed1');
        user2 = await createUser('seed2');

        const commitA = await createCommitAndData('perspective A', user1.jwt);
        perspectiveA = await createPerspective(
            creatorId,
            564564,
            user1.jwt,
            commitA
        );

        const commitB = await createCommitAndData('text 123456', user1.jwt);
        perspectiveB = await createPerspective(
            creatorId,
            846851,
            user1.jwt,
            commitB,
            perspectiveA
        );

        const commitC1 = await createCommitAndData('text 12345', user1.jwt);
        perspectiveC1 = await createPerspective(
            creatorId2,
            458765,
            user1.jwt,
            commitC1,
            perspectiveB
        ); 

        const commitC2 = await createCommitAndData('text Test tester', user1.jwt);
        perspectiveC2 = await createPerspective(
            creatorId2,
            123456,
            user1.jwt,
            commitC2,
            perspectiveB
        ); 

        const commitD1 = await createCommitAndData('tstert5465', user1.jwt);
        perspectiveD1 = await createPerspective(
            creatorId2,
            789456,
            user1.jwt,
            commitD1,
            perspectiveC1
        ); 


        
        // finalDelegateTo of B is C        

        // Set perspective C delegate to true and set toDelegate perspective D

        // const delegateC = await delegatePermissionsTo(
        //     perspectiveC,
        //     perspectiveD,
        //     user1.jwt
        // );

        // finalDelegateTo of C is D

        // finalDelegate changes
        // finalDelegate of B is D
        // finalDelegate of A is D

        // expect(delegateC.result).toEqual(SUCCESS);

        // shouldn't an xid be unique?
        // New query modified (not a valid scalar)
    });

    // it('changes `delegate` property to false in accessConfig', async () => {
    //     // Changes perspective A to false

    //     const removeDelegateA = await setDelegateToFalse(
    //         perspectiveA,
    //         user2.jwt
    //     );

    //     expect(removeDelegateA.result).toEqual(SUCCESS);

    //     // Expect to receive finalDelegateTo of perspective A (its same ID)
    //     console.log(removeDelegateA);
    // });
});