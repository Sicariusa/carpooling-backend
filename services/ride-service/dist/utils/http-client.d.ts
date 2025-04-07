export declare class HttpClient {
    static sendBookingEvent(event: any): Promise<boolean>;
    static sendNotification(notification: any): Promise<boolean>;
    static verifyUser(userId: string): Promise<any>;
    static isUserFemale(userId: string): Promise<boolean>;
}
