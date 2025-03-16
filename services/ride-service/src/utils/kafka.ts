import { Kafka } from "kafkajs";
import { Logger } from "@nestjs/common";

const logger = new Logger('Kafka');

const kafka = new Kafka({
  clientId: "ride-service",
  brokers: ["localhost:9092"], // Ensure your Kafka broker is running
});

export const consumer = kafka.consumer({ groupId: "ride-group" });

let isConsumerInitialized = false;

//  Store verified users in memory (or use Redis for persistence)
const verifiedUsers = new Set<string>();

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

    logger.log(' Kafka Consumer Connected and Subscribed to user-events');
    isConsumerInitialized = true;
  } catch (error) {
    logger.error(` Failed to connect Kafka consumer: ${error.message}`);
    throw error;
  }
}

/**
 * Starts consuming Kafka messages and processing events.
 */
export async function startConsumer() {
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
          handleKafkaEvent(event);
        } catch (error) {
          logger.error(`❌ Error processing Kafka message: ${error.message}`);
        }
      },
    });

    logger.log('🚀 Kafka consumer started and listening for user events');
  } catch (error) {
    logger.error(` Failed to start Kafka consumer: ${error.message}`);
    throw error;
  }
}

/**
 * Handles Kafka events based on event type.
 * @param event - The parsed Kafka event message
 */
function handleKafkaEvent(event: any) {
  const eventType = event.type || event.event;  //  Handle both formats

  switch (eventType) {
    case 'USER_VERIFIED':
      logger.log(` User verified: ${event.userId}`);
      verifiedUsers.add(event.userId.toString()); //  Ensure it's stored as a string
      break;

    default:
      logger.warn(` Unknown event type: ${eventType}`);
      break;
  }
}
/**
 * Checks if a user is verified before creating a ride.
 * @param userId - The ID of the user (driver)
 */
export function isUserVerified(userId: string): boolean {
  logger.log(` Users verified: ${verifiedUsers}`);
  return verifiedUsers.has(userId);
}

/**
 * Gracefully disconnects the Kafka consumer.
 */
export async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    logger.log(' Kafka Consumer Disconnected');
    isConsumerInitialized = false;
  } catch (error) {
    logger.error(` Failed to disconnect Kafka consumer: ${error.message}`);
  }
}
