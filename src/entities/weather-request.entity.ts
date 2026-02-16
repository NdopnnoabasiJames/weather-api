import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Location } from './location.entity';

@Entity('weather_requests')
@Index(['locationId', 'startDate', 'endDate'])
export class WeatherRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  locationInput: string;

  @Column({ type: 'uuid' })
  locationId: string;

  @ManyToOne(() => Location, (location) => location.weatherRequests, {
    eager: true,
  })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'jsonb' })
  rawApiResponse: any;

  @Column({ type: 'float', nullable: true })
  avgTemperature?: number;

  @Column({ type: 'float', nullable: true })
  minTemperature?: number;

  @Column({ type: 'float', nullable: true })
  maxTemperature?: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
