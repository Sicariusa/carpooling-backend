import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ID, ObjectType, Float, Int } from '@nestjs/graphql';

export type StopDocument = Stop & Document;

@ObjectType()
@Schema({ timestamps: true })
export class Stop {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field()
  @Prop({ required: true })
  name: string;

  @Field()
  @Prop({ required: true })
  address: string;

  @Field(() => Float)
  @Prop({ required: true })
  latitude: number;

  @Field(() => Float)
  @Prop({ required: true })
  longitude: number;

  @Field(() => Int)
  @Prop({ required: true, min: 1 })
  sequence: number;

  @Field(() => Boolean)
  @Prop({ default: true })
  isActive: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const StopSchema = SchemaFactory.createForClass(Stop); 