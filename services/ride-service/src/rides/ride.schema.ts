import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RideDocument = Ride & Document;

@Schema({ timestamps: true })
export class Ride {
  @Prop({ required: true })
  driverId: string;

  @Prop({ required: true })
  origin: string;

  @Prop({ required: true })
  destination: string;

  @Prop({ required: true })
  departure: Date;

  @Prop({ required: true })
  seatsAvailable: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: false })
  isGirlsOnly: boolean;

  @Prop({ default: false })
  isFromGIU: boolean;

  @Prop({ default: false })
  isToGIU: boolean;

  @Prop()
  bookingDeadline?: Date;

  @Prop({ enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'PENDING' })
  status: string;
}

export const RideSchema = SchemaFactory.createForClass(Ride);
