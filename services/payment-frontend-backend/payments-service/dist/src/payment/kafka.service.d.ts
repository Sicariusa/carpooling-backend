import { OnModuleInit } from '@nestjs/common';
export declare class KafkaService implements OnModuleInit {
    private kafka;
    private producer;
    onModuleInit(): Promise<void>;
    send(topic: string, message: any): Promise<void>;
}
