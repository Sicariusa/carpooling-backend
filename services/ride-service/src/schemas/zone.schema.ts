import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ID, ObjectType, Int } from '@nestjs/graphql';

export type ZoneDocument = Zone & Document;

@ObjectType()
@Schema({ timestamps: true })
export class Zone {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field()
  @Prop({ required: true, unique: true })
  name: string;

  @Field()
  @Prop({ required: true })
  description: string;

  @Field(() => Int)
  @Prop({ required: true, default: 0 })
  distanceFromGIU: number; // in kilometers

  @Field(() => Boolean)
  @Prop({ default: true })
  isActive: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);
