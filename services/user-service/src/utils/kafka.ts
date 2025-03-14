import { Logger } from '@nestjs/common';
import { Kafka } from 'kafkajs';

const logger = new Logger('Kafka');

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: ['localhost:9092'],
});

export const producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
  logger.log('Kafka Producer Connected');
}

export async function publishUserVerifiedEvent(userId: number) {
  try {
    await producer.send({
      topic: 'user-events',
      messages: [{ value: JSON.stringify({ type: 'USER_VERIFIED', userId }) }],
    });

    logger.log(`Sent Kafka Event: USER_VERIFIED | User ID: ${userId}`);
  } catch (error) {
    logger.error(`Failed to send Kafka Event: ${error.message}`);
  }
}

export async function publishUserLoginEvent(userId: number) {
  try {
    await producer.send({
      topic: 'user-events',
      messages: [{ 
        value: JSON.stringify({ 
          type: 'USER_LOGIN', 
          userId,
          timestamp: new Date().toISOString() 
        }) 
      }],
    });

    logger.log(`Sent Kafka Event: USER_LOGIN | User ID: ${userId}`);
  } catch (error) {
    logger.error(`Failed to send Kafka Event: ${error.message}`);
  }
}
