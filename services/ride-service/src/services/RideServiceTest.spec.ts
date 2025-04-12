import { Test, TestingModule } from '@nestjs/testing';
import { RideService } from './ride.service';
import { getModelToken } from '@nestjs/mongoose';
import { StopService } from './stop.service';
import { ZoneService } from './zone.service';
import { Client } from '@googlemaps/google-maps-services-js';
import { ConfigService } from '@nestjs/config';

jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      emit: jest.fn(),
      on: jest.fn(),
    })),
  };
});

describe('RideService', () => {
  let rideService: RideService;
  let mockStopService: Partial<StopService>;
  let mockZoneService: Partial<ZoneService>;
  let mockGoogleMapsClient: Partial<Client>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockStopService = { findById: jest.fn() };
    mockZoneService = { findById: jest.fn() };
    mockGoogleMapsClient = { distancematrix: jest.fn() }; // Mock Google Maps client
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_MAPS_API_KEY') {
          return ''; // Mock API key
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RideService,
        { provide: getModelToken('Ride'), useValue: {} }, // Mock Mongoose model
        { provide: StopService, useValue: mockStopService }, // Mock StopService
        { provide: ZoneService, useValue: mockZoneService }, // Mock ZoneService
        { provide: Client, useValue: mockGoogleMapsClient }, // Mock Google Maps Client
        { provide: ConfigService, useValue: mockConfigService }, // Mock ConfigService
      ],
    }).compile();

    rideService = module.get<RideService>(RideService);
  });

  it('should be defined', () => {
    expect(rideService).toBeDefined();
  });

  it('should calculate road distance correctly', async () => {
    // Mock response for the Google Maps API
    const mockDistanceMatrixResponse = {
      data: {
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { value: 15000 }, // 15 km in meters
              },
            ],
          },
        ],
      },
    };

    // Mock the distancematrix method to return the mock response
    jest.spyOn(mockGoogleMapsClient, 'distancematrix').mockResolvedValue(mockDistanceMatrixResponse as any);

    const distance = await rideService.calculateRoadDistance(
      { lat: 30.0444, lng: 31.2357 },
      { lat: 29.9792, lng: 31.1342 },
    );

    expect(distance).toBe(15); // 15 km
    expect(mockGoogleMapsClient.distancematrix).toHaveBeenCalledWith({
      params: {
        origins: ['30.0444,31.2357'],
        destinations: ['29.9792,31.1342'],
        key: '',
      },
    });
  });
});