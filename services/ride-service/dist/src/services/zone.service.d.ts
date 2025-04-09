import { Model } from 'mongoose';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { CreateZoneInput, UpdateZoneInput } from '../dto/zone.dto';
export declare class ZoneService {
    private zoneModel;
    constructor(zoneModel: Model<ZoneDocument>);
    findAll(): Promise<Zone[]>;
    findById(id: string): Promise<Zone>;
    create(createZoneInput: CreateZoneInput): Promise<Zone>;
    update(id: string, updateZoneInput: UpdateZoneInput): Promise<Zone>;
    remove(id: string): Promise<boolean>;
    validateZoneDirection(fromZoneId: string, toZoneId: string): Promise<boolean>;
    findZonesWithDistanceZero(): Promise<Zone[]>;
}
