// cancel-payment-response.dto.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class CancelPaymentResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
