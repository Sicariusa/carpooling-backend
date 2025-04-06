import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

const logger = new Logger('BookingService');

@Injectable()
export class BookingService {
  constructor(private readonly httpService: HttpService) {}

  async getBookingById(bookingId: string): Promise<any> {
    const url = `${process.env.BOOKING_SERVICE_URL}/api/bookings/${bookingId}`;
    
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error: AxiosError) => {
            logger.error(`Error fetching booking ${bookingId}: ${error.message}`);
            throw new Error(`Failed to fetch booking: ${error.message}`);
          }),
        ),
      );
      return data;
    } catch (error) {
      logger.error(`Failed to get booking ${bookingId}: ${error.message}`);
      throw error;
    }
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<any> {
    const url = `${process.env.BOOKING_SERVICE_URL}/api/bookings/${bookingId}/status`;
    
    try {
      const { data } = await firstValueFrom(
        this.httpService.patch(url, { status }).pipe(
          catchError((error: AxiosError) => {
            logger.error(`Error updating booking status ${bookingId}: ${error.message}`);
            throw new Error(`Failed to update booking status: ${error.message}`);
          }),
        ),
      );
      return data;
    } catch (error) {
      logger.error(`Failed to update booking status ${bookingId}: ${error.message}`);
      throw error;
    }
  }
} 