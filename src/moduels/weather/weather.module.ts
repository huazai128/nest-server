import { Module } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Module({
  imports: [],
  controllers: [],
  providers: [WeatherService],
})
export class WeatherModule {}
