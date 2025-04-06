import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';

const logger = new Logger('BookingService');

@Injectable()
export class BookingService {
  constructor(private readonly httpService: HttpService) {}

  async getBookingById(bookingId: string): Promise<any> {
    const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3001';
    
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${bookingServiceUrl}/graphql`,
          {
            query: `
              query GetBooking($id: ID!) {
                getBooking(id: $id) {
                  id
                  userId
                  rideId
                  status
                  pickupLocation
                  dropoffLocation
                  createdAt
                  updatedAt
                }
              }
            `,
            variables: { id: bookingId }
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        ).pipe(
          catchError((error: AxiosError) => {
            logger.error(`Error fetching booking ${bookingId}: ${error.message}`);
            throw new Error(`Failed to fetch booking: ${error.message}`);
          }),
        ),
      );

      if (data.errors) {
        throw new Error(`GraphQL error fetching booking: ${data.errors[0].message}`);
      }

      return data.data.getBooking;
    } catch (error) {
      logger.error(`Failed to get booking ${bookingId}: ${error.message}`);
      throw error;
    }
  }

  async updateBookingAfterPayment(bookingId: string, status: string): Promise<any> {
    const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3001';
    
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${bookingServiceUrl}/graphql`,
          {
            query: `
              mutation UpdateBookingAfterPayment($bookingId: ID!, $status: String!) {
                updateBookingAfterPayment(bookingId: $bookingId, status: $status) {
                  id
                  status
                }
              }
            `,
            variables: { bookingId, status }
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        ).pipe(
          catchError((error: AxiosError) => {
            logger.error(`Error updating booking after payment ${bookingId}: ${error.message}`);
            throw new Error(`Failed to update booking after payment: ${error.message}`);
          }),
        ),
      );

      if (data.errors) {
        throw new Error(`GraphQL error updating booking: ${data.errors[0].message}`);
      }

      return data.data.updateBookingAfterPayment;
    } catch (error) {
      logger.error(`Failed to update booking after payment ${bookingId}: ${error.message}`);
      throw error;
    }
  }

  // Keep this method for backward compatibility
  async updateBookingStatus(bookingId: string, status: string): Promise<any> {
    return this.updateBookingAfterPayment(bookingId, status);
  }
} 