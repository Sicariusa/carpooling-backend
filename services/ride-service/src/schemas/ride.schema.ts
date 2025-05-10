import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ID, ObjectType, Int, Float, registerEnumType } from '@nestjs/graphql';

export type RideDocument = Ride & Document;

export enum RideStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

registerEnumType(RideStatus, {
  name: 'RideStatus',
  description: 'Status of a ride',
});

@ObjectType()
export class RideStop {
  @Field(() => ID)
  @Prop({ type: Types.ObjectId, required: true })
  stopId: Types.ObjectId;

  @Field(() => Int)
  @Prop({ required: true, min: 1 })
  sequence: number;
}

@ObjectType()
@Schema({ timestamps: true })
export class Ride {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field(() => ID)
  @Prop({ required: true })
  driverId: string; // ID from user service

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, required: true })
  selectedRouteId: Types.ObjectId;

  @Field(() => [RideStop])
  @Prop({ type: [Object], required: true })
  stops: RideStop[];

  @Field(() => Boolean)
  @Prop({ required: true })
  startFromGIU: boolean; // Indicates if ride starts from GIU or ends at GIU

  @Field()
  @Prop({ required: true })
  departureTime: Date;

  @Field(() => Date, { nullable: true })
  @Prop()
  bookingDeadline: Date;

  @Field(() => Int)
  @Prop({ required: true, min: 1 })
  totalSeats: number;

  @Field(() => Int)
  @Prop({ required: true, min: 0 })
  availableSeats: number;

  @Field(() => Float)
  @Prop({ required: true, min: 0 })
  pricePerSeat: number;

  @Field(() => Float)
  @Prop({ required: true, min: 1, default: 1 })
  priceScale: number; // Multiplier for price based on distance (further stops pay more)

  @Field(() => Boolean)
  @Prop({ default: false })
  girlsOnly: boolean;

  @Field(() => RideStatus)
  @Prop({ type: String, enum: RideStatus, default: RideStatus.SCHEDULED })
  status: RideStatus;

  @Field()
  @Prop({ required: true })
  startLocation: string;

  @Field()
  @Prop({ required: true })
  endLocation: string;

  @Field(() => [String])
  @Prop({ type: [String], default: [] })
  bookingIds: string[]; // IDs from booking service

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const RideSchema = SchemaFactory.createForClass(Ride);
