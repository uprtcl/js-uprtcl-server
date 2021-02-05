import { NewPerspective, Update } from '@uprtcl/evees';
import { did, xid } from '../uprtcl/types';

export enum ProposalState {
  Open = 'OPEN',
  Rejected = 'REJECTED',
  Executed = 'EXECUTED',
  Declined = 'DECLINED',
}

export interface Proposal {
  id: string;
  creatorId?: string;
  toPerspectiveId?: string;
  fromPerspectiveId: string;
  toHeadId?: string;
  fromHeadId?: string;
  details: {
    updates?: Update[];
    newPerspectives?: NewPerspective[];
  };

  state: ProposalState;
  executed: boolean;
  authorized: boolean;
  canAuthorize?: boolean;
}

export interface NewProposalData {
  creatorId: string;
  fromPerspectiveId: string;
  toPerspectiveId: string;
  fromHeadId: string;
  toHeadId: string;
  details: {
    updates: Array<Update>;
    newPerspectives: Array<NewPerspective>;
  };
}

export interface DgNewPerspective {
  NEWP_perspectiveId: string;
  NEWP_parentId: string;
  NEWP_headId: string;
}

export interface DgProposal {
  uid?: string;
  creator: did;
  state: ProposalState;
  fromPerspective: xid;
  toPerspective: xid;
  fromHead: xid;
  toHead: xid;
  updates?: Array<DgUpdate>;
  newPerspectives?: Array<DgNewPerspective>;
}

export interface DgUpdate {
  fromPerspective: xid;
  perspective: xid;
  oldHead?: xid;
  newHead: xid;
}
