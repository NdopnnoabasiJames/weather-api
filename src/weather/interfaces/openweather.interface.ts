export interface OpenWeatherResponse {
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

export interface AirPollutionResponse {
  list: Array<{
    main: {
      aqi: number;
    };
  }>;
}

export interface AirQualityData {
  aqi: number;
  category: string;
}
