import { Kafka } from "kafkajs";
import { Logger } from "@nestjs/common";

const logger = new Logger('Kafka');

const kafka = new Kafka({
  clientId: "booking-service",
  brokers: ["localhost:9092"],
});

export const consumer = kafka.consumer({ groupId: "booking-group" });

export async function connectConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: "user-events", fromBeginning: true });
    logger.log('Kafka Consumer Connected and Subscribed to user-events');
  } catch (error) {
    logger.error(`Failed to connect Kafka consumer: ${error.message}`);
    throw error;
  }
}

export async function startConsumer(bookingService) {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = message.value?.toString();
          if (!messageValue) {
            logger.warn('Received empty Kafka message');
            return;
          }
          
          const event = JSON.parse(messageValue);
          logger.log(`Received Kafka event: ${JSON.stringify(event)}`);
          
          // Handle user login events
          if (event.type === 'USER_LOGIN') {
            logger.log(`User login detected: ${event.userId} at ${event.timestamp || new Date().toISOString()}`);
            
            // If bookingService has a logUserLogin method, call it
            if (bookingService && typeof bookingService.logUserLogin === 'function') {
              await bookingService.logUserLogin(event.userId);
            }
          }
          
          // Handle user verified events
          else if (event.type === 'USER_VERIFIED') {
            logger.log(`User verified: ${event.userId}`);
            // Add any specific handling for user verification if needed
          }
          
          // Handle legacy format (for backward compatibility)
          else if (event.event === 'USER_VERIFIED') {
            logger.log(`User verified (legacy format): ${event.userId}`);
            // Add any specific handling for user verification if needed
          }
          
          else {
            logger.warn(`Unknown event type: ${event.type || event.event}`);
          }
        } catch (error) {
          logger.error(`Error processing Kafka message: ${error.message}`);
        }
      },
    });
    
    logger.log('Kafka consumer started and listening for user events');
  } catch (error) {
    logger.error(`Failed to start Kafka consumer: ${error.message}`);
    throw error;
  }
}

// Helper function to gracefully disconnect the consumer
export async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    logger.log('Kafka Consumer Disconnected');
  } catch (error) {
    logger.error(`Failed to disconnect Kafka consumer: ${error.message}`);
  }
}
