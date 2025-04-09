import { Zone } from '../schemas/zone.schema';
import { ZoneService } from '../services/zone.service';
import { CreateZoneInput, UpdateZoneInput } from '../dto/zone.dto';
export declare class ZoneResolver {
    private zoneService;
    constructor(zoneService: ZoneService);
    zones(): Promise<Zone[]>;
    zone(id: string): Promise<Zone>;
    createZone(input: CreateZoneInput): Promise<Zone>;
    updateZone(id: string, input: UpdateZoneInput): Promise<Zone>;
    removeZone(id: string): Promise<boolean>;
}
