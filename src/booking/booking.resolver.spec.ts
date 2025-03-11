import { Test, TestingModule } from '@nestjs/testing';
import { BookingResolver } from './booking.resolver';

describe('BookingResolver', () => {
  let resolver: BookingResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingResolver],
    }).compile();

    resolver = module.get<BookingResolver>(BookingResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
