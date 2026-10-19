import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class DeliveryOrderItemInputDto {
  @IsString() purchaseOrderItemId: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) qtyDelivered: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateDeliveryOrderDto {
  @IsDateString() doDate: string;
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsString() deliveryContact?: string;
  @IsOptional() @IsString() vehicleNo?: string;
  @IsOptional() @IsString() driverName?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => DeliveryOrderItemInputDto)
  items: DeliveryOrderItemInputDto[];
}
