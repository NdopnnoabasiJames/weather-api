import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Health check and service status' })
  @ApiResponse({
    status: 200,
    description: 'Service is running',
  })
  getRoot() {
    return {
      status: 'ok',
      service: 'Weather Backend API',
    };
  }
}
