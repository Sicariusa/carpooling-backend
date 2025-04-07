import { Stop } from '../schemas/stop.schema';
import { StopService } from '../services/stop.service';
import { CreateStopInput, UpdateStopInput } from '../dto/stop.dto';
export declare class StopResolver {
    private stopService;
    constructor(stopService: StopService);
    stops(): Promise<Stop[]>;
    stop(id: string): Promise<Stop>;
    stopsByZone(zoneId: string): Promise<Stop[]>;
    createStop(input: CreateStopInput): Promise<Stop>;
    updateStop(id: string, input: UpdateStopInput): Promise<Stop>;
    removeStop(id: string): Promise<boolean>;
    zone(stop: Stop): Promise<any>;
}
