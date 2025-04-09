export declare function connectConsumer(): Promise<void>;
export declare function startConsumer(rideService: any): Promise<void>;
export declare function disconnectConsumer(): Promise<void>;
export declare function produceMessage(topic: string, message: any): Promise<boolean>;
