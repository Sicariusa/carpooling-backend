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
}

export async function startConsumer(bookingService) {
  try {
    await consumer.subscribe({ topic: "user-events", fromBeginning: true });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value?.toString() || '{}');
          console.log(`Received message from topic ${topic}:`, payload);
          
          // Handle different types of events
          if (payload.event === 'USER_LOGIN') {
            await bookingService.logUserLogin(payload.userId);
          }
          
        } catch (error) {
          console.error('Error processing Kafka message:', error);
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

// Send a message to a Kafka topic
export async function produceMessage(topic: string, message: any) {
  try {
    await producer.send({
      topic,
      messages: [
        { value: JSON.stringify(message) },
      ],
    });
    return true;
  } catch (error) {
    console.error(`Error producing message to ${topic}:`, error);
    return false;
  }
}
