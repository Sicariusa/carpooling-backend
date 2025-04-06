import { Kafka, Consumer, Producer } from "kafkajs";
import { Logger } from "@nestjs/common";

const logger = new Logger('Kafka');

let consumer: Consumer;
let producer: Producer;

const kafka = new Kafka({
  clientId: "payment-service",
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

export async function connectConsumer() {
  consumer = kafka.consumer({ groupId: "payment-service-group" });
  await consumer.connect();
  
  // Also initialize the producer
  producer = kafka.producer();
  await producer.connect();
  
  // Subscribe to payment-events topic for payment requests
  await consumer.subscribe({ topic: "payment-events", fromBeginning: true });
  
  logger.log('Kafka consumer connected and subscribed to required topics');
}

export async function startConsumer(paymentService) {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value?.toString() || '{}');
          logger.log(`Received message from topic ${topic}:`, payload);
          
          // Handle different types of events based on the topic
          if (topic === 'payment-events') {
            handlePaymentEvents(payload, paymentService);
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

// Handle payment-related events
function handlePaymentEvents(payload, paymentService) {
  switch (payload.type) {
    case 'CREATE_PAYMENT_INTENT':
      paymentService.createPaymentFromKafka(
        payload.bookingId,
        payload.userId,
        payload.amount,
        payload.currency || 'USD'
      );
      break;
    case 'CANCEL_PAYMENT':
      paymentService.cancelPaymentByBookingId(payload.bookingId);
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