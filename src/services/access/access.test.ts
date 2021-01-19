import { toBeValidCid, SUCCESS } from '../../utils';
import {
  delegatePermissionsTo,
  finDelegatedChildNodes,
  getSecondLayerFinDelegatedTo,
  getAccessConfigOfElement,
  getPermissionsConfig,
  addPermission,
} from './access.testsupport';
import { PermissionType } from './access.schema';
import { createUser } from '../user/user.testsupport';
import {
  createCommitAndData,
  createPerspective,
} from '../uprtcl/uprtcl.testsupport';

describe('delegate behavior', () => {
  expect.extend({ toBeValidCid });

  let user1: any = {};

  let perspectiveA = '';
  let perspectiveB = '';
  let perspectiveC1 = '';

  it('should update all finDelegatedTo of all children and clone permissions', async () => {
    user1 = await createUser('seed1');
    const user2 = await createUser('seed2');
    const user3 = await createUser('seed3');
    const user4 = await createUser('seed4');

    const commitA = await createCommitAndData(
      'perspective A',
      false,
      user1.jwt
    );
    perspectiveA = await createPerspective(
      user1,
      454545,
      'barack_obama',
      user1.jwt,
      commitA
    );

    const commitB = await createCommitAndData(
      'perspective B',
      false,
      user1.jwt
    );
    perspectiveB = await createPerspective(
      user1,
      846851,
      'barack_obama',
      commitB,
      perspectiveA
    );

    const commitC1 = await createCommitAndData(
      'perspective C1',
      false,
      user1.jwt
    );
    perspectiveC1 = await createPerspective(
      user1,
      458765,
      'barack_obama',
      commitC1,
      perspectiveB
    );

    const commitC2 = await createCommitAndData(
      'perspective C2',
      false,
      user1.jwt
    );
    const perspectiveC2 = await createPerspective(
      user1,
      123456,
      'cold_war',
      commitC2,
      perspectiveB
    );

    const commitD1 = await createCommitAndData(
      'perspective D1',
      false,
      user1.jwt
    );
    const perspectiveD1 = await createPerspective(
      user1,
      789456,
      'cold_war',
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
    const perspAccessConfig = await getAccessConfigOfElement(finDelegatedTo);
    const perspBAccessConfig = await getAccessConfigOfElement(perspectiveB);

    // Add permissions to finDelegatedTo
    await addPermission(
      finDelegatedTo,
      user2.userId,
      PermissionType.Read,
      user1.jwt
    );

    await addPermission(
      finDelegatedTo,
      user3.userId,
      PermissionType.Read,
      user1.jwt
    );

    //Add permissions to perspectiveB
    await addPermission(
      perspectiveB,
      user4.userId,
      PermissionType.Write,
      user1.jwt
    );

    await addPermission(
      perspectiveB,
      user3.userId,
      PermissionType.Write,
      user1.jwt
    );

    const perspPermissions = await getPermissionsConfig(
      perspAccessConfig.permissionsUid!
    );
    const perspBPermissions = await getPermissionsConfig(
      perspBAccessConfig.permissionsUid!
    );

    // Permissions before delegating to false
    expect(perspBPermissions.canWrite![0]).toEqual(user3.userId.toLowerCase());
    expect(perspBPermissions.canWrite![1]).toEqual(user4.userId.toLowerCase());
    expect(perspBPermissions.canAdmin![0]).toEqual(user1.userId.toLowerCase());

    // From true to false
    const delegateToB = await delegatePermissionsTo(
      perspectiveB,
      false,
      undefined,
      user1.jwt
    );
    expect(delegateToB.result).toEqual(SUCCESS);

    // Permissions of B after delegate false
    const perspFalsePermissions = await getPermissionsConfig(
      perspBAccessConfig.permissionsUid!
    );

    // Checks how permissions are cloned
    // Permissions after delegating to false
    expect(perspPermissions).toEqual(perspFalsePermissions);

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
  });
});
