import { Kafka, Consumer, Producer } from "kafkajs";
import { Logger } from "@nestjs/common";

const logger = new Logger('Kafka');

let consumer: Consumer;
let producer: Producer;

const kafka = new Kafka({
  clientId: "booking-service",
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

export async function connectConsumer() {
  consumer = kafka.consumer({ groupId: "booking-service-group" });
  await consumer.connect();
  
  // Also initialize the producer
  producer = kafka.producer();
  await producer.connect();
  
  // Subscribe to booking-responses topic for responses from ride service
  await consumer.subscribe({ topic: "booking-responses", fromBeginning: true });
  // Subscribe to ride-events to keep track of ride updates
  await consumer.subscribe({ topic: "ride-events", fromBeginning: true });
  // Keep the user-events subscription
  await consumer.subscribe({ topic: "user-events", fromBeginning: true });
  
  logger.log('Kafka consumer connected and subscribed to required topics');
}

export async function startConsumer(bookingService) {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value?.toString() || '{}');
          logger.log(`Received message from topic ${topic}:`, payload);
          
          // Handle different types of events based on the topic
          if (topic === 'user-events') {
            handleUserEvents(payload, bookingService);
          } else if (topic === 'booking-responses') {
            handleBookingResponses(payload, bookingService);
          } else if (topic === 'ride-events') {
            handleRideEvents(payload, bookingService);
          }
          
        } catch (error) {
          logger.error('Error processing Kafka message:', error);
        }
      },
    });
    
    logger.log('Kafka consumer started and listening for events');
  } catch (error) {
    logger.error(`Failed to start Kafka consumer: ${error.message}`);
    throw error;
  }
}

// Handle user-related events
function handleUserEvents(payload, bookingService) {
  switch (payload.event || payload.type) {
    case 'USER_LOGIN':
      bookingService.logUserLogin(payload.userId);
      break;
    default:
      logger.log(`Unhandled user event type: ${payload.event || payload.type}`);
  }
}

// Handle booking response events from the ride service
function handleBookingResponses(payload, bookingService) {
  switch (payload.type) {
    case 'BOOKING_VERIFICATION_SUCCESS':
      bookingService.processVerificationSuccess(payload.bookingId, payload.rideId, payload.driverId);
      break;
    case 'BOOKING_VERIFICATION_FAILED':
      bookingService.processVerificationFailure(payload.bookingId, payload.rideId, payload.reason);
      break;
    default:
      logger.log(`Unhandled booking response type: ${payload.type}`);
  }
}

// Handle ride-related events
function handleRideEvents(payload, bookingService) {
  switch (payload.type) {
    case 'RIDE_UPDATED':
      // Process ride updates if needed
      break;
    case 'SEATS_UPDATED':
      // Process seat availability updates if needed
      break;
    case 'RIDE_DELETED':
      // Handle ride cancellation, notify affected bookings
      bookingService.handleRideCancellation(payload.rideId);
      break;
    default:
      logger.log(`Unhandled ride event type: ${payload.type}`);
  }
}

// Helper function to gracefully disconnect the consumer
export async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    await producer.disconnect();
    logger.log('Kafka Consumer and Producer Disconnected');
  } catch (error) {
    logger.error(`Failed to disconnect Kafka: ${error.message}`);
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
