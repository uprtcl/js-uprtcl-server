import { PERSPECTIVE_SCHEMA_NAME, COMMIT_SCHEMA_NAME } from '../uprtcl/uprtcl.schema';

export const PROPOSALS_SCHEMA_NAME = 'Proposal';
export const HEAD_UPDATE_SCHEMA_NAME = 'HeadUpdate';
export const PROPOSAL_STATE_TYPE = 'ProposalStateType';

export const PROPOSAL_SCHEMA = `

    enum ${PROPOSAL_STATE_TYPE} {
        Open
        Closed
        Executed
        Cancelled
    }

    type ${HEAD_UPDATE_SCHEMA_NAME} {
        perspective: ${PERSPECTIVE_SCHEMA_NAME}
        head: ${COMMIT_SCHEMA_NAME}
    }

    type ${PROPOSALS_SCHEMA_NAME} {
        toPrespective: ${PERSPECTIVE_SCHEMA_NAME}
        fromPerspective: ${PERSPECTIVE_SCHEMA_NAME}
        updates: [${HEAD_UPDATE_SCHEMA_NAME}]
        state: ${PROPOSAL_STATE_TYPE}
    }

    perspective: uid .
    head: uid .
    toPrespective: uid .
    fromPrespective: uid .
    updates: [uid] .
`;