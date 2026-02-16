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

    // Step 3: Check cache first - return immediately if exists
    const cachedData = await this.getFromCache(cacheKey);
    if (cachedData) {
      return {
        ...cachedData,
        isCached: true,
      };
    }

    // Step 4: Cache miss - attempt external API call
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

      // Step 5: API success - store in cache with TTL
      await this.setInCache(cacheKey, response);

      return response;
    } catch (error) {
      // Step 6: API failed - check cache again as fallback
      this.logger.error(`API call failed: ${error.message}`);

      const fallbackData = await this.getFromCache(cacheKey);
      if (fallbackData) {
        this.logger.warn('Returning stale cached data due to API failure');
        return {
          ...fallbackData,
          isCached: true,
          warning: 'Live data unavailable. Showing last cached result.',
        };
      }

      // No cache available - throw 503
      throw new HttpException(
        'Weather service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async getFromCache(
    key: string,
  ): Promise<CurrentWeatherResponseDto | null> {
    try {
      const data = await this.redis.get<CurrentWeatherResponseDto>(key);

      if (data) {
        this.logger.log(`Cache hit for key: ${key}`);
      } else {
        this.logger.log(`Cache miss for key: ${key}`);
      }

      return data;
    } catch (error) {
      this.logger.warn(`Redis get error: ${error.message}`);
      return null;
    }
  }

  private async setInCache(
    key: string,
    data: CurrentWeatherResponseDto,
  ): Promise<void> {
    try {
      await this.redis.set(key, data, { ex: this.cacheTTL });
      this.logger.log(`Data cached with ${this.cacheTTL}s TTL`);
    } catch (error) {
      this.logger.warn(`Redis set error: ${error.message}`);
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
