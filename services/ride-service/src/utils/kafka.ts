import { Logger } from '@nestjs/common';
import { Kafka, Consumer, Producer } from 'kafkajs';

const logger = new Logger('Kafka');

let consumer: Consumer;
let producer: Producer;

const kafka = new Kafka({
  clientId: 'ride-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

export async function connectConsumer() {
  consumer = kafka.consumer({ groupId: 'ride-service-group' });
  await consumer.connect();
  
  // Also initialize the producer
  producer = kafka.producer();
  await producer.connect();
  
  // Subscribe to booking events
  await consumer.subscribe({ topic: 'booking-events', fromBeginning: true });
  // Subscribe to user events
  await consumer.subscribe({ topic: 'user-events', fromBeginning: true });
  // Subscribe to payment events (if implementing payment)
  await consumer.subscribe({ topic: 'payment-events', fromBeginning: true });
  // Subscribe to ride data requests
  await consumer.subscribe({ topic: 'ride-data-requests', fromBeginning: true });
  
  logger.log('Kafka consumer connected and subscribed to required topics');
}

export async function startConsumer(rideService) {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value?.toString() || '{}');
          logger.log(`Received message from topic ${topic}:`, payload);
          
          // Handle different types of events based on the topic
          if (topic === 'booking-events') {
            handleBookingEvents(payload, rideService);
          } else if (topic === 'user-events') {
            handleUserEvents(payload, rideService);
          } else if (topic === 'payment-events') {
            handlePaymentEvents(payload, rideService);
          } else if (topic === 'ride-data-requests') {
            handleRideDataRequests(payload, rideService);
          }
          
        } catch (error) {
          logger.error('Error processing Kafka message:', error);
        }
      },
    });
    
    logger.log('Kafka consumer started and listening for events');
  } catch (error: any) {
    logger.error(`Failed to start Kafka consumer: ${error.message}`);
    throw error;
  }
}

// Handle ride data requests
async function handleRideDataRequests(payload, rideService) {
  const { requestId, type, params } = payload;
  
  try {
    let responseData;
    
    switch (type) {
      case 'GET_RIDE':
        responseData = await rideService.findById(params.rideId);
        break;
      case 'CALCULATE_FARE':
        responseData = await rideService.calculateFareForBooking(
          params.rideId, 
          params.pickupStopId, 
          params.dropoffStopId
        );
        break;
      case 'GET_STOP':
        responseData = await rideService.getStopDetails(params.stopId);
        break;
      default:
        throw new Error(`Unknown ride data request type: ${type}`);
    }
    
    // Send response back
    await produceMessage('ride-data-responses', {
      requestId,
      type,
      data: responseData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Send error response
    await produceMessage('ride-data-responses', {
      requestId,
      type,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

// Handle booking-related events
function handleBookingEvents(payload, rideService) {
  switch (payload.type) {
    case 'BOOKING_CREATED':
      rideService.verifyRideBooking(payload.bookingId, payload.rideId, payload.userId);
      break;
    case 'BOOKING_CANCELLED':
      rideService.handleBookingCancellation(payload.bookingId, payload.rideId, payload.userId);
      break;
    case 'BOOKING_ACCEPTED':
      rideService.handleBookingAcceptance(payload.bookingId, payload.rideId, payload.driverId);
      break;
    case 'BOOKING_REJECTED':
      rideService.handleBookingRejection(payload.bookingId, payload.rideId, payload.driverId);
      break;
    case 'BOOKING_DESTINATION_MODIFIED':
      rideService.handleDestinationChange(payload.bookingId, payload.rideId, payload.userId, payload.newDropoffLocation);
      break;
    default:
      logger.log(`Unhandled booking event type: ${payload.type}`);
  }
}

// Handle user-related events
function handleUserEvents(payload, rideService) {
  switch (payload.event || payload.type) {
    case 'USER_VERIFIED':
      rideService.handleUserVerification(payload.userId, payload.isDriver);
      break;
    case 'DRIVER_APPROVED':
      rideService.handleDriverApproval(payload.userId);
      break;
    default:
      logger.log(`Unhandled user event type: ${payload.event || payload.type}`);
  }
}

// Handle payment-related events
function handlePaymentEvents(payload, rideService) {
  switch (payload.type) {
    case 'PAYMENT_COMPLETED':
      rideService.handlePaymentCompleted(payload.bookingId, payload.rideId, payload.userId);
      break;
    case 'PAYMENT_FAILED':
      rideService.handlePaymentFailed(payload.bookingId, payload.rideId, payload.userId);
      break;
    default:
      logger.log(`Unhandled payment event type: ${payload.type}`);
  }
}

// Helper function to gracefully disconnect the consumer
export async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    await producer.disconnect();
    logger.log('Kafka Consumer and Producer Disconnected');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to disconnect Kafka: ${errorMessage}`);
  }
}

// Send a message to a Kafka topic
export async function produceMessage(topic: string, message: any) {
  try {
    await producer.send({
      topic,
      messages: [
        { value: JSON.stringify(message) },
      ],
    });
    logger.log(`Produced message to ${topic}: ${JSON.stringify(message)}`);
    return true;
  } catch (error) {
    logger.error(`Error producing message to ${topic}:`, error);
    return false;
  }
}