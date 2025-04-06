import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';

const logger = new Logger('BookingService');

@Injectable()
export class BookingService {
  constructor(private readonly httpService: HttpService) {}

  // This method is kept for backward compatibility only
  // In a production app, this should be replaced with a Kafka-based approach 
  // async getBookingById(bookingId: string): Promise<any> {
  //   const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3001';
    
  //   try {
  //     const { data } = await firstValueFrom(
  //       this.httpService.post(
  //         `${bookingServiceUrl}/graphql`,
  //         {
  //           query: `
  //             query GetBooking($id: ID!) {
  //               getBooking(id: $id) {
  //                 id
  //                 userId
  //                 rideId
  //                 status
  //                 pickupLocation
  //                 dropoffLocation
  //                 createdAt
  //                 updatedAt
  //               }
  //             }
  //           `,
  //           variables: { id: bookingId }
  //         },
  //         {
  //           headers: { 'Content-Type': 'application/json' }
  //         }
  //       ).pipe(
  //         catchError((error: AxiosError) => {
  //           logger.error(`Error fetching booking ${bookingId}: ${error.message}`);
  //           throw new Error(`Failed to fetch booking: ${error.message}`);
  //         }),
  //       ),
  //     );

  //     if (data.errors) {
  //       throw new Error(`GraphQL error fetching booking: ${data.errors[0].message}`);
  //     }

  //     return data.data.getBooking;
  //   } catch (error) {
  //     logger.error(`Failed to get booking ${bookingId}: ${error.message}`);
  //     throw error;
  //   }
  // }

  // These methods are kept for backward compatibility
  // but they're no longer used in the Kafka implementation
  async updateBookingAfterPayment(bookingId: string, status: string): Promise<any> {
    logger.log(`[DEPRECATED] updateBookingAfterPayment called for booking ${bookingId} with status ${status}`);
    logger.log('This method is deprecated. Use Kafka events instead.');
    return { id: bookingId, status };
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<any> {
    logger.log(`[DEPRECATED] updateBookingStatus called for booking ${bookingId} with status ${status}`);
    logger.log('This method is deprecated. Use Kafka events instead.');
    return { id: bookingId, status };
  }
} 