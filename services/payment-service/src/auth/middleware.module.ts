import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';

@Module({
  providers: [AuthMiddleware],
  exports: [AuthMiddleware],
})
export class MiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Applying the AuthMiddleware to all routes
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
