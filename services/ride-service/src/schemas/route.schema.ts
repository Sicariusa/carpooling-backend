import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ID, ObjectType, Float, Int } from '@nestjs/graphql';
import { Stop } from './stop.schema';

export type RouteDocument = Route & Document;

@ObjectType()
export class RouteStop {
  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'Stop', required: true })
  stopId: Types.ObjectId;

  @Field(() => Int)
  @Prop({ required: true })
  sequence: number; // 1 for first stop, 2 for second, etc.

  @Field(() => Stop)
  stop: Stop;
}

const RouteStopSchema = SchemaFactory.createForClass(RouteStop);

@ObjectType()
@Schema({ timestamps: true })
export class Route {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field()
  @Prop({ required: true })
  name: string;

  @Field()
  @Prop({ required: true })
  description: string;

  @Field(() => Float)
  @Prop({ required: true })
  totalDistance: number; // in kilometers

  @Field(() => [RouteStop])
  @Prop({ type: [RouteStopSchema], required: true })
  stops: RouteStop[];

  @Field(() => Boolean)
  @Prop({ required: true })
  startFromGIU: boolean; // if true, first stop is GIU, otherwise last stop is GIU

  @Field(() => Boolean)
  @Prop({ default: true })
  isActive: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const RouteSchema = SchemaFactory.createForClass(Route);
