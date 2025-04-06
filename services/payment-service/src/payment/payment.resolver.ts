import { Resolver, Mutation, Args, Query, ID } from '@nestjs/graphql';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './schemas/payment.schema';
import { CurrentUser } from '../auth/current-user.decorator';

@Resolver(() => Payment)
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Mutation(() => Payment)
  async createPayment(
    @Args('data') data: CreatePaymentDto,
    @CurrentUser() user: any,
  ) {
    const { payment, clientSecret } = await this.paymentService.createPaymentIntent(data, user.id);
  
    return {
      ...payment,
      clientSecret, // 👈 ADD THIS LINE
    };
  }
  

  @Query(() => [Payment])
  async getMyPayments(@CurrentUser() user: any) {
    return this.paymentService.getPaymentsByUser(user.id);
  }

  @Query(() => Payment)
  async getPaymentById(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.getPaymentById(id, user.id);
  }

  @Mutation(() => Payment)
  async refundPayment(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.refundPayment(id, user);
  }
}
