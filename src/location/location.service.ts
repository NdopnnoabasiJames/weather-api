import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { ResolvedLocationResponseDto } from './dto/resolved-location-response.dto';

interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('openweather.apiKey') || '';
    this.baseUrl = this.configService.get<string>('openweather.baseUrl') || 'https://api.openweathermap.org';

    if (!this.apiKey) {
      throw new Error('OpenWeather API key is not configured');
    }
  }

  async resolveLocation(query: string): Promise<ResolvedLocationResponseDto> {
    const url = `${this.baseUrl}/geo/1.0/direct`;
    const params = {
      q: query,
      limit: 1,
      appid: this.apiKey,
    };

    try {
      this.logger.log(`Resolving location for query: ${query}`);

      const response: AxiosResponse<GeocodingResult[]> = await firstValueFrom(
        this.httpService.get<GeocodingResult[]>(url, { params }).pipe(
          timeout(5000),
          catchError((error: AxiosError) => {
            this.logger.error(
              `OpenWeather API error: ${error.message}`,
              error.stack,
            );
            throw new HttpException(
              'Weather service temporarily unavailable',
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Unexpected error while resolving location: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        'Weather service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
