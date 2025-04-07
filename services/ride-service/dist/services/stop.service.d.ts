import { Model } from 'mongoose';
import { Stop, StopDocument } from '../schemas/stop.schema';
import { CreateStopInput, UpdateStopInput } from '../dto/stop.dto';
import { ZoneService } from './zone.service';
export declare class StopService {
    private stopModel;
    private zoneService;
    constructor(stopModel: Model<StopDocument>, zoneService: ZoneService);
    findAll(): Promise<Stop[]>;
    findById(id: string): Promise<Stop>;
    findByZone(zoneId: string): Promise<Stop[]>;
    create(createStopInput: CreateStopInput): Promise<Stop>;
    update(id: string, updateStopInput: UpdateStopInput): Promise<Stop>;
    remove(id: string): Promise<boolean>;
    getZoneForStop(stopId: string): Promise<any>;
}
