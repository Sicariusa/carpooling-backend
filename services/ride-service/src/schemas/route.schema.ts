import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ID, ObjectType } from '@nestjs/graphql';

export type RouteDocument = Route & Document;

@ObjectType()
@Schema({ timestamps: true })
export class Route {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field()
  @Prop({ required: true })
  name: string;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, required: true })
  zoneId: Types.ObjectId;

  @Field(() => [ID])
  @Prop({ type: [Types.ObjectId], required: true })
  stopIds: Types.ObjectId[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const RouteSchema = SchemaFactory.createForClass(Route);
