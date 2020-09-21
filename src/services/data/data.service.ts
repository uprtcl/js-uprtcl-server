import { DGraphService } from "../../db/dgraph.service";
import { DataRepository } from "../data/data.repository";
import { Hashed, Secured, Commit, Signed } from "../uprtcl/types";
import { UprtclRepository } from "../uprtcl/uprtcl.repository";

const propertyOrder = ['creatorsIds', 'dataId', 'message', 'timestamp', 'parentsIds'];

export class DataService {

  constructor(
    protected db: DGraphService, 
    protected dataRepo: DataRepository,
    protected uprtclRepo: UprtclRepository ) {
  }

  async createData(
    data: Hashed<Object>, 
    _loggedUserId: string | null): Promise<string> {

    console.log('[UPRTCL-SERVICE] createData', data);
    
    if(
      (data.object as Signed<any>).payload !== undefined && 
      propertyOrder.every((p) => (data.object as Signed<any>).payload.hasOwnProperty(p))) {

      console.log('[UPRTCL-SERVICE] commitPatternDetected', data);
      return await this.uprtclRepo.createCommit(data as Secured<Commit>);
    }
    
    let dataId = await this.dataRepo.createData(data);
    
    return dataId;
  };

  async getData(dataId: string): Promise<any> {
    console.log('[UPRTCL-SERVICE] getData', dataId);
    let data = await this.dataRepo.getData(dataId);
    return data;
  };

}

