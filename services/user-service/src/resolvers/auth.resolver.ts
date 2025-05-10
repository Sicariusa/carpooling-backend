import { Resolver, Mutation, Args, Int, Query } from '@nestjs/graphql';
import { AuthService } from '../services/auth.service';
import { User } from '../schema/user';
import { Public } from '../guards/auth.guard';
import { producer } from '../utils/kafka';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class LoginResponse {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
}

@ObjectType()
export class UserInfo {
  @Field()
  id: string;

  @Field(() => Int)
  universityId: number;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field(() => Int, { nullable: true })
  phoneNumber?: number;

  @Field()
  firstName: string;

  @Field()
  lastName: string;
  
}

@ObjectType()
export class TokenValidationResponse {
  @Field()
  isValid: boolean;

  @Field({ nullable: true })
  error?: string;

  @Field(() => UserInfo, { nullable: true })
  user?: UserInfo;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => LoginResponse)
  @Public()
  async login(
    @Args('universityId', { type: () => Int }) universityId: number,
    @Args('password') password: string,
  ) {
    // Publish event to Kafka
    await producer.send({
      topic: "user-events",
      messages: [{ value: JSON.stringify({ event: "USER_VERIFIED", userId: universityId }) }],
    });

    console.log(`📢 USER_VERIFIED event sent for user: ${universityId}`); 
    return this.authService.login(universityId, password);
  }

  @Query(() => TokenValidationResponse)
  @Public()
  async validateToken(
    @Args('token') token: string,
  ) {
    return this.authService.validateToken(token);
  }
} 