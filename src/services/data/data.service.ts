import { DGraphService } from "../../db/dgraph.service";
import { DataRepository } from "../data/data.repository";
import { Hashed, Secured, Commit } from "../uprtcl/types";
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

    const dataCoded = {...data.object};
    const castToObject:any = dataCoded; 
 
    if(castToObject.payload !== undefined) {
      if(propertyOrder.map((p) => castToObject.hasOwnProperty(p))) {      
        const { proof, payload } = castToObject;

        const commit: Secured<Commit> = {
         id: data.id,
         object: {
           payload: payload,
           proof: proof
         }    
        }
        
        return await this.uprtclRepo.createCommit(commit);
      }
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

