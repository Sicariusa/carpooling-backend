"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const common_1 = require("@nestjs/common");
const node_fetch_1 = require("node-fetch");
const logger = new common_1.Logger('HttpClient');
class HttpClient {
    static async sendBookingEvent(event) {
        try {
            const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
            const response = await (0, node_fetch_1.default)(`${bookingServiceUrl}/api/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            });
            if (!response.ok) {
                throw new Error(`Failed to send booking event: ${response.statusText}`);
            }
            logger.log(`HTTP event sent to booking service: ${event.type}`);
            return true;
        }
        catch (error) {
            logger.error(`Failed to send HTTP event to booking service: ${error.message}`);
            return false;
        }
    }
    static async sendNotification(notification) {
        try {
            const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
            const response = await (0, node_fetch_1.default)(`${notificationServiceUrl}/api/notifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(notification),
            });
            if (!response.ok) {
                throw new Error(`Failed to send notification: ${response.statusText}`);
            }
            logger.log(`Notification sent to: ${notification.recipientId}`);
            return true;
        }
        catch (error) {
            logger.error(`Failed to send notification: ${error.message}`);
            return false;
        }
    }
    static async verifyUser(userId) {
        try {
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3000';
            const response = await (0, node_fetch_1.default)(`${userServiceUrl}/api/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to verify user: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            logger.error(`Failed to verify user ${userId}: ${error.message}`);
            return null;
        }
    }
    static async isUserFemale(userId) {
        try {
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3000';
            const response = await (0, node_fetch_1.default)(`${userServiceUrl}/api/users/${userId}/gender`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get user gender: ${response.statusText}`);
            }
            const data = await response.json();
            return data.gender === 'female';
        }
        catch (error) {
            logger.error(`Failed to check if user ${userId} is female: ${error.message}`);
            return false;
        }
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=http-client.js.map