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
import { ResolvedLocationResponseDto } from './dto/resolved-location-response.dto';
import { REDIS_CLIENT } from '../redis/redis.module';
import { GeocodingResult } from './interfaces/geocoding.interface';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheTTL = 86400; // 86400 seconds = 24 hours

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly httpService: HttpService,
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

  async resolveLocation(query: string): Promise<ResolvedLocationResponseDto> {
    this.logger.log(`Resolving location for query: ${query}`);

    // Step 1: Generate cache key
    const cacheKey = `location:${query.toLowerCase()}`;

    // Step 2: Check cache first - return immediately if exists
    const cachedData = await this.getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Step 3: Cache miss - attempt external API call
    try {
      const result = await this.fetchLocationFromAPI(query);

      // Step 4: API success - store in cache with TTL
      await this.setInCache(cacheKey, result);

      return result;
    } catch (error) {
      // Step 5: API failed - check cache again as fallback
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
        // Location not found - don't check cache, throw immediately
        throw error;
      }

      this.logger.error(`API call failed: ${error.message}`);

      const fallbackData = await this.getFromCache(cacheKey);
      if (fallbackData) {
        this.logger.warn('Returning cached data due to API failure');
        return fallbackData;
      }

      // No cache available - throw 503
      throw new HttpException(
        'Location service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async getFromCache(
    key: string,
  ): Promise<ResolvedLocationResponseDto | null> {
    try {
      const data = await this.redis.get<ResolvedLocationResponseDto>(key);

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
    data: ResolvedLocationResponseDto,
  ): Promise<void> {
    try {
      await this.redis.set(key, data, { ex: this.cacheTTL });
      this.logger.log(`Location cached with ${this.cacheTTL}s TTL`);
    } catch (error) {
      this.logger.warn(`Redis set error: ${error.message}`);
    }
  }

  private async fetchLocationFromAPI(
    query: string,
  ): Promise<ResolvedLocationResponseDto> {
    const url = `${this.baseUrl}/geo/1.0/direct`;
    const params = {
      q: query,
      limit: 1,
      appid: this.apiKey,
    };

    this.logger.log(`Calling OpenWeather Geocoding API for: ${query}`);

    const response: AxiosResponse<GeocodingResult[]> = await firstValueFrom(
      this.httpService.get<GeocodingResult[]>(url, { params }).pipe(
        timeout(5000),
        catchError((error: AxiosError) => {
          this.logger.error(
            `OpenWeather API error: ${error.message}`,
            error.stack,
          );
          throw new HttpException(
            'Location service temporarily unavailable',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }),
      ),
    );

    const results = response.data;

    if (!results || results.length === 0) {
      this.logger.warn(`No location found for query: ${query}`);
      throw new HttpException(
        `Location not found for query: ${query}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const location = results[0];
    const normalizedLocation = location.state
      ? `${location.name}, ${location.state}, ${location.country}`
      : `${location.name}, ${location.country}`;

    this.logger.log(`Location resolved: ${normalizedLocation}`);

    return {
      input: query,
      normalizedLocation,
      latitude: location.lat,
      longitude: location.lon,
    };
  }
}
