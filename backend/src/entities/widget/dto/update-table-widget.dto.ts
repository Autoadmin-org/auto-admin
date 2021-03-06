import { ApiProperty } from '@nestjs/swagger';
import { WidgetTypeEnum } from '../../../enums';

export class UpdateTableWidgetDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  field_name: string;

  @ApiProperty()
  widget_type: WidgetTypeEnum;

  @ApiProperty()
  widget_params: Array<string>;
}
