import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { BookingService } from './services/booking.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly bookingService: BookingService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('test-payment-webhook/:bookingId/:status')
  async testPaymentWebhook(
    @Param('bookingId') bookingId: string,
    @Param('status') status: string,
  ) {
    const booking = await this.bookingService.updateBookingAfterPayment(bookingId, status);
    return {
      success: true,
      message: `Booking ${bookingId} updated with status ${status}`,
      booking,
    };
  }
}
