import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Redis } from '@upstash/redis';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { LocationService } from '../location/location.service';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';
import { REDIS_CLIENT } from '../redis/redis.module';

interface OpenWeatherResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  weather: Array<{
    description: string;
  }>;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheTTL = 600; // 600 seconds = 10 minutes

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly httpService: HttpService,
    private readonly locationService: LocationService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('openweather.apiKey') || '';
    this.baseUrl =
      this.configService.get<string>('openweather.baseUrl') ||
      'https://api.openweathermap.org';

    if (!this.apiKey) {
      throw new Error('OpenWeather API key is not configured');
    }
  }

  async getCurrentWeather(
    locationQuery: string,
  ): Promise<CurrentWeatherResponseDto> {
    // Step 1: Resolve location
    this.logger.log(`Fetching weather for location: ${locationQuery}`);
    const resolvedLocation =
      await this.locationService.resolveLocation(locationQuery);

    // Step 2: Generate cache key
    const cacheKey = `weather:${resolvedLocation.latitude}:${resolvedLocation.longitude}`;
    this.logger.log(`Cache key: ${cacheKey}`);

    // Step 3: Check Redis cache
    try {
      const cachedData = await this.redis.get<CurrentWeatherResponseDto>(
        cacheKey,
      );

      if (cachedData) {
        this.logger.log('Returning cached weather data');
        return {
          ...cachedData,
          isCached: true,
        };
      }
    } catch (error) {
      this.logger.warn(`Redis get error: ${error.message}`);
    }

    // Step 4: Fetch from OpenWeather API
    try {
      const weatherData = await this.fetchWeatherFromAPI(
        resolvedLocation.latitude,
        resolvedLocation.longitude,
      );

      const response: CurrentWeatherResponseDto = {
        location: resolvedLocation.normalizedLocation,
        temperature: weatherData.main.temp,
        feelsLike: weatherData.main.feels_like,
        humidity: weatherData.main.humidity,
        windSpeed: weatherData.wind.speed,
        weatherDescription: weatherData.weather[0]?.description || 'Unknown',
        fetchedAt: new Date().toISOString(),
        isCached: false,
      };

      // Step 5: Store in Redis with TTL
      try {
        await this.redis.set(cacheKey, response, { ex: this.cacheTTL });
        this.logger.log(`Weather data cached with ${this.cacheTTL}s TTL`);
      } catch (error) {
        this.logger.warn(`Redis set error: ${error.message}`);
      }

      return response;
    } catch (error) {
      // Step 6: Handle API failure - try to return cached data with warning
      this.logger.error(`OpenWeather API failed: ${error.message}`);

      try {
        const cachedData = await this.redis.get<CurrentWeatherResponseDto>(
          cacheKey,
        );

        if (cachedData) {
          this.logger.warn(
            'API failed, returning stale cached data with warning',
          );
          return {
            ...cachedData,
            isCached: true,
            warning: 'Using cached data due to API unavailability',
          };
        }
      } catch (redisError) {
        this.logger.error(`Redis fallback failed: ${redisError.message}`);
      }

      // No cache available, throw 503
      throw new HttpException(
        'Weather service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async fetchWeatherFromAPI(
    lat: number,
    lon: number,
  ): Promise<OpenWeatherResponse> {
    const url = `${this.baseUrl}/data/2.5/weather`;
    const params = {
      lat: lat.toString(),
      lon: lon.toString(),
      appid: this.apiKey,
      units: 'metric',
    };

    this.logger.log(`Calling OpenWeather API: lat=${lat}, lon=${lon}`);

    const response: AxiosResponse<OpenWeatherResponse> = await firstValueFrom(
      this.httpService.get<OpenWeatherResponse>(url, { params }).pipe(
        timeout(5000),
        catchError((error: AxiosError) => {
          this.logger.error(
            `OpenWeather API error: ${error.message}`,
            error.stack,
          );
          throw new HttpException(
            'Weather API request failed',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }),
      ),
    );

    return response.data;
  }
}
