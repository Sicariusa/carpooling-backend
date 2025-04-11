import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsInt } from 'class-validator';

@InputType()
export class CreatePaymentDto {
  @Field()
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @Field(() => Int)
  @IsInt()
  amount: number;
}
