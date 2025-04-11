const bookingService = require('./booking.service');

describe('Booking Service', () => {
    test('should create a booking successfully', () => {
        const bookingData = { userId: 1, roomId: 101, date: '2023-10-01' };
        const result = bookingService.createBooking(bookingData);
        expect(result).toHaveProperty('id');
        expect(result.userId).toBe(bookingData.userId);
        expect(result.roomId).toBe(bookingData.roomId);
    });

    test('should throw an error for invalid booking data', () => {
        const bookingData = { userId: null, roomId: 101, date: '2023-10-01' };
        expect(() => bookingService.createBooking(bookingData)).toThrow('Invalid booking data');
    });

    test('should retrieve a booking by ID', () => {
        const bookingId = 1;
        const result = bookingService.getBookingById(bookingId);
        expect(result).toHaveProperty('id', bookingId);
    });

    test('should return null for non-existent booking', () => {
        const bookingId = 999;
        const result = bookingService.getBookingById(bookingId);
        expect(result).toBeNull();
    });
});