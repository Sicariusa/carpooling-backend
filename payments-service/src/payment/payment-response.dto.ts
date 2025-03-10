import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaymentResponse {
  @Field({ nullable: true })
  clientSecret?: string;

  @Field({ nullable: true })
  message?: string;
}
