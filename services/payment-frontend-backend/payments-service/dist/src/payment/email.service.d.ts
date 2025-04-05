export declare class EmailService {
    private transporter;
    constructor();
    sendEmail(to: string, subject: string, text: string): Promise<void>;
}
