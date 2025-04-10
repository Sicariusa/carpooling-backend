import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    payment: any;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
