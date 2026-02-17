import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().required(),
  API_PREFIX: Joi.string().default('api/v1'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // OpenWeather API
  OPENWEATHER_API_KEY: Joi.string().required(),
  OPENWEATHER_BASE_URL: Joi.string().default('https://api.openweathermap.org'),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: Joi.string().uri().required(),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().required(),

  // Throttle
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(20),
});
