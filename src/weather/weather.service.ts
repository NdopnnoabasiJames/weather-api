import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Redis } from '@upstash/redis';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { LocationService } from '../location/location.service';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';
import { CreateWeatherRequestDto } from './dto/create-weather-request.dto';
import { UpdateWeatherRequestDto } from './dto/update-weather-request.dto';
import { WeatherRequestResponseDto } from './dto/weather-request-response.dto';
import { Location } from '../entities/location.entity';
import { WeatherRequest } from '../entities/weather-request.entity';
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
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(WeatherRequest)
    private readonly weatherRequestRepository: Repository<WeatherRequest>,
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

  // CRUD Operations for Weather Requests

  async create(
    createDto: CreateWeatherRequestDto,
  ): Promise<WeatherRequestResponseDto> {
    const { locationInput, startDate, endDate, note } = createDto;

    // Step 1: Validate date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        throw new BadRequestException(
          'startDate must be before endDate',
        );
      }
    }

    // Step 2: Resolve location
    this.logger.log(`Creating weather request for: ${locationInput}`);
    const resolvedLocation =
      await this.locationService.resolveLocation(locationInput);

    // Step 3: Find or create Location entity
    const location = await this.findOrCreateLocation(resolvedLocation);

    // Step 4: Check if request already exists (for historical data)
    if (startDate && endDate) {
      const existingRequest = await this.findExistingWeatherRequest(
        location.id,
        new Date(startDate),
        new Date(endDate),
      );

      if (existingRequest) {
        this.logger.log('Returning existing weather request');
        return this.mapToResponseDto(existingRequest);
      }
    }

    // Step 5: Fetch weather data (this would be historical API in production)
    // For now, using current weather as placeholder
    const weatherData = await this.fetchWeatherFromAPI(
      location.latitude,
      location.longitude,
    );

    // Step 6: Calculate temperature statistics
    const { avgTemperature, minTemperature, maxTemperature } =
      this.calculateTemperatureStats(weatherData);

    // Step 7: Create and save WeatherRequest
    const weatherRequest = this.weatherRequestRepository.create({
      locationInput,
      location: location,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      rawApiResponse: weatherData,
      avgTemperature,
      minTemperature,
      maxTemperature,
      note,
    });

    const savedRequest: WeatherRequest = await this.weatherRequestRepository.save(weatherRequest);

    return this.mapToResponseDto(savedRequest);
  }

  async findAll(): Promise<WeatherRequestResponseDto[]> {
    this.logger.log('Fetching all weather requests');
    const requests = await this.weatherRequestRepository.find({
      order: { createdAt: 'DESC' },
    });

    return requests.map((req) => this.mapToResponseDto(req));
  }

  async findOne(id: string): Promise<WeatherRequestResponseDto> {
    this.logger.log(`Fetching weather request: ${id}`);
    const request = await this.weatherRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Weather request with ID ${id} not found`);
    }

    return this.mapToResponseDto(request);
  }

  async update(
    id: string,
    updateDto: UpdateWeatherRequestDto,
  ): Promise<WeatherRequestResponseDto> {
    const request = await this.weatherRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Weather request with ID ${id} not found`);
    }

    // Only allow updating the note field to preserve data integrity
    if (updateDto.note !== undefined) {
      request.note = updateDto.note;
    }

    const updated = await this.weatherRequestRepository.save(request);

    return this.mapToResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const request = await this.weatherRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Weather request with ID ${id} not found`);
    }

    await this.weatherRequestRepository.remove(request);
    this.logger.log(`Deleted weather request: ${id}`);
  }

  async exportData(format: 'json' | 'csv'): Promise<string | WeatherRequestResponseDto[]> {
    this.logger.log(`Exporting weather data in ${format} format`);

    const requests = await this.weatherRequestRepository.find({
      order: { createdAt: 'DESC' },
    });

    if (requests.length === 0) {
      throw new NotFoundException('No weather request records found to export');
    }

    if (format === 'json') {
      return this.exportAsJson(requests);
    } else if (format === 'csv') {
      return this.exportAsCsv(requests);
    } else {
      throw new BadRequestException('Unsupported export format');
    }
  }

  private exportAsJson(requests: WeatherRequest[]): WeatherRequestResponseDto[] {
    return requests.map((req) => this.mapToResponseDto(req));
  }

  private exportAsCsv(requests: WeatherRequest[]): string {
    // Define CSV headers
    const headers = [
      'id',
      'locationInput',
      'locationName',
      'state',
      'country',
      'latitude',
      'longitude',
      'startDate',
      'endDate',
      'avgTemperature',
      'minTemperature',
      'maxTemperature',
      'note',
      'createdAt',
    ];

    // Build CSV rows
    const rows = requests.map((request) => {
      if (!request.location) {
        throw new HttpException(
          'Weather request location data is missing',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return [
        request.id,
        this.escapeCsvValue(request.locationInput),
        this.escapeCsvValue(request.location.name),
        this.escapeCsvValue(request.location.state || ''),
        this.escapeCsvValue(request.location.country),
        request.location.latitude,
        request.location.longitude,
        request.startDate ? this.formatDate(request.startDate) : '',
        request.endDate ? this.formatDate(request.endDate) : '',
        request.avgTemperature || '',
        request.minTemperature || '',
        request.maxTemperature || '',
        this.escapeCsvValue(request.note || ''),
        this.formatDate(request.createdAt),
      ].join(',');
    });

    // Combine headers and rows
    return [headers.join(','), ...rows].join('\n');
  }

  private escapeCsvValue(value: string): string {
    if (!value) return '';

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private formatDate(date: Date): string {
    return new Date(date).toISOString();
  }

  // Helper Methods

  private async findOrCreateLocation(resolvedLocation: {
    normalizedLocation: string;
    latitude: number;
    longitude: number;
  }): Promise<Location> {
    // Try to find existing location by coordinates
    let location = await this.locationRepository.findOne({
      where: {
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
      },
    });

    if (!location) {
      // Parse normalized location
      const parts = resolvedLocation.normalizedLocation.split(', ');
      const name = parts[0];
      const country = parts[parts.length - 1];
      const state = parts.length === 3 ? parts[1] : undefined;

      // Create new location
      location = this.locationRepository.create({
        name,
        state,
        country,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
      });

      location = await this.locationRepository.save(location);
      this.logger.log(`Created new location: ${location.id}`);
    } else {
      this.logger.log(`Found existing location: ${location.id}`);
    }

    return location;
  }

  private async findExistingWeatherRequest(
    locationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WeatherRequest | null> {
    return await this.weatherRequestRepository.findOne({
      where: {
        locationId,
        startDate,
        endDate,
      },
    });
  }

  private calculateTemperatureStats(weatherData: OpenWeatherResponse): {
    avgTemperature: number;
    minTemperature: number;
    maxTemperature: number;
  } {
    // For current weather, all values are the same
    // In a real scenario with historical data, this would iterate over multiple data points
    const temp = weatherData.main.temp;

    return {
      avgTemperature: temp,
      minTemperature: temp,
      maxTemperature: temp,
    };
  }

  private mapToResponseDto(
    weatherRequest: WeatherRequest,
  ): WeatherRequestResponseDto {
    // Ensure location is loaded
    if (!weatherRequest.location) {
      throw new HttpException(
        'Weather request location data is missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      id: weatherRequest.id,
      locationInput: weatherRequest.locationInput,
      location: {
        id: weatherRequest.location.id,
        name: weatherRequest.location.name,
        state: weatherRequest.location.state,
        country: weatherRequest.location.country,
        latitude: weatherRequest.location.latitude,
        longitude: weatherRequest.location.longitude,
      },
      startDate: weatherRequest.startDate,
      endDate: weatherRequest.endDate,
      avgTemperature: weatherRequest.avgTemperature,
      minTemperature: weatherRequest.minTemperature,
      maxTemperature: weatherRequest.maxTemperature,
      note: weatherRequest.note,
      createdAt: weatherRequest.createdAt,
      updatedAt: weatherRequest.updatedAt,
    };
  }
}
