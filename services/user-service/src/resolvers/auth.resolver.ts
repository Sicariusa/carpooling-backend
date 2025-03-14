import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { AuthService } from '../services/auth.service';
import { User } from '../schema/user';
import { Public } from '../guards/auth.guard';

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
}

// Define this at the top of the file or in a separate file if you prefer
import { ObjectType, Field } from '@nestjs/graphql';
import { producer } from 'src/utils/kafka';

@ObjectType()
export class LoginResponse {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
} 