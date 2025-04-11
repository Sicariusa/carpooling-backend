// src/types/express.d.ts
import { Request } from 'express';

declare module 'express' {
  interface Request {
    rawBody?: Buffer;
  }
}