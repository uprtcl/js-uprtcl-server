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
