import { Kafka } from "kafkajs";
import { Logger } from "@nestjs/common";

const logger = new Logger('Kafka');

const kafka = new Kafka({
  clientId: "ride-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

export const consumer = kafka.consumer({ groupId: "ride-group" });
export const producer = kafka.producer();

let isConsumerInitialized = false;
let isProducerInitialized = false;

/**
 * Connects and subscribes to Kafka topics.
 */
export async function connectConsumer() {
  if (isConsumerInitialized) {
    logger.warn("⚠️ Kafka Consumer is already initialized. Skipping subscription.");
    return;
  }

  try {
    await consumer.connect();
    await consumer.subscribe({ topic: "user-events", fromBeginning: true });
    await consumer.subscribe({ topic: "booking-events", fromBeginning: true });
    
    logger.log('✅ Kafka Consumer Connected and Subscribed to required topics');
    isConsumerInitialized = true;
  } catch (error) {
    logger.error(`❌ Failed to connect Kafka consumer: ${error.message}`);
    throw error;
  }
}

/**
 * Connects the Kafka producer.
 */
export async function connectProducer() {
  if (isProducerInitialized) {
    logger.warn("⚠️ Kafka Producer is already initialized.");
    return;
  }

  try {
    await producer.connect();
    logger.log('✅ Kafka Producer Connected');
    isProducerInitialized = true;
  } catch (error) {
    logger.error(`❌ Failed to connect Kafka producer: ${error.message}`);
    throw error;
  }
}

/**
 * Starts consuming Kafka messages and processing events.
 */
export async function startConsumer(rideService) {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = message.value?.toString();
          if (!messageValue) {
            logger.warn('⚠️ Received empty Kafka message');
            return;
          }

          const event = JSON.parse(messageValue);
          logger.log(`📥 Received Kafka Event: ${JSON.stringify(event)}`);

          // Event Handling Logic
          handleKafkaEvent(event, rideService);
        } catch (error) {
          logger.error(`❌ Error processing Kafka message: ${error.message}`);
        }
      },
    });

    logger.log('🚀 Kafka consumer started and listening for events');
  } catch (error) {
    logger.error(`❌ Failed to start Kafka consumer: ${error.message}`);
    throw error;
  }
}

/**
 * Handles Kafka events based on event type.
 * @param event - The parsed Kafka event message
 * @param rideService - The ride service instance for handling ride-related operations
 */
function handleKafkaEvent(event: any, rideService: any) {
  switch (event.type) {
    case 'USER_VERIFIED':
      logger.log(`✅ User verified: ${event.userId}`);
      // Example: Store user verification status in a cache or DB
      break;
      
    case 'BOOKING_CREATED':
      logger.log(`✅ Booking created: ${event.bookingId} for ride: ${event.rideId}`);
      // Check if seats are available and update ride status if needed
      rideService.verifyRideBooking(event.rideId, event.bookingId);
      break;
      
    case 'BOOKING_CANCELLED':
      logger.log(`✅ Booking cancelled: ${event.bookingId} for ride: ${event.rideId}`);
      // Increase available seats
      rideService.handleBookingCancellation(event.rideId);
      break;
      
    case 'BOOKING_ACCEPTED':
      logger.log(`✅ Booking accepted: ${event.bookingId} for ride: ${event.rideId}`);
      // Decrease available seats
      rideService.handleBookingAccepted(event.rideId);
      break;
      
    case 'BOOKING_REJECTED':
      logger.log(`✅ Booking rejected: ${event.bookingId} for ride: ${event.rideId}`);
      // No need to update seats as they weren't reserved yet
      break;

    default:
      logger.warn(`⚠️ Unknown event type: ${event.type || event.event}`);
      break;
  }
}

/**
 * Sends a message to a Kafka topic.
 * @param topic - Kafka topic to send message to
 * @param message - Message payload
 */
export async function produceMessage(topic: string, message: any) {
  if (!isProducerInitialized) {
    await connectProducer();
  }
  
  try {
    await producer.send({
      topic,
      messages: [
        { value: JSON.stringify(message) },
      ],
    });
    logger.log(`📤 Produced message to ${topic}: ${JSON.stringify(message)}`);
    return true;
  } catch (error) {
    logger.error(`❌ Error producing message to ${topic}: ${error.message}`);
    return false;
  }
}

/**
 * Gracefully disconnects the Kafka consumer and producer.
 */
export async function disconnectKafka() {
  try {
    if (isConsumerInitialized) {
      await consumer.disconnect();
      logger.log('🔌 Kafka Consumer Disconnected');
      isConsumerInitialized = false;
    }
    
    if (isProducerInitialized) {
      await producer.disconnect();
      logger.log('🔌 Kafka Producer Disconnected');
      isProducerInitialized = false;
    }
  } catch (error) {
    logger.error(`❌ Failed to disconnect Kafka: ${error.message}`);
  }
}
