import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BedHarvest, BedState, BedsService, SeedDrop, SeedPackets } from './beds.service';
import { PlantBedDto } from './dto/plant-bed.dto';

@ApiBearerAuth()
@ApiTags('beds')
@Controller({ path: 'beds', version: '1' })
export class BedsController {
  constructor(private readonly beds: BedsService) {}

  @Get('active')
  @ApiOperation({
    summary: "The learner's active bed (Seeds & Harvest)",
    description:
      "The bed today's planting takes words from: the seed packet picked last (`user_beds` " +
      'active), else the first bed from onboarding; null when there is none. ' +
      '`harvest_ready` = every READY word is planted (S2 Bed harvest shows).',
  })
  async active(@CurrentUser('id') userId: string): Promise<BedState | null> {
    return this.beds.active(userId);
  }

  // Declared before `:topicId/harvest` so "packets" isn't read as a topic id.
  @Get('packets')
  @ApiOperation({
    summary: 'The 3 seed packets for the next bed (S3)',
    description:
      'Follow the bee (most words already in the garden), Same goal (title fits the goal, else the ' +
      "current bed's shelf), Something new (an unplanted shelf at the learner's level). Only public " +
      'beds the learner never planted from; fewer than 3 when the library runs out.',
  })
  async packets(@CurrentUser('id') userId: string): Promise<SeedPackets> {
    return this.beds.packets(userId);
  }

  @Get('seed-drops/next')
  @ApiOperation({
    summary: 'The oldest seed drop not shown yet (S1 Fruit drops seeds)',
    description:
      'A review that turns a word into fruit drops up to 2 related words (reviewed ' +
      "`word_relations`) into the learner's garden. null when every drop was seen.",
  })
  async nextDrop(@CurrentUser('id') userId: string): Promise<SeedDrop | null> {
    return this.beds.nextDrop(userId);
  }

  @Get('seed-drops/:droppedBy')
  @ApiOperation({ summary: 'The seeds one fruit word dropped (S1)' })
  async drop(
    @CurrentUser('id') userId: string,
    @Param('droppedBy', ParseUUIDPipe) droppedBy: string,
  ): Promise<SeedDrop> {
    return this.beds.drop(userId, droppedBy);
  }

  @Post('seed-drops/:droppedBy/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'S1 was shown for this drop' })
  async seen(
    @CurrentUser('id') userId: string,
    @Param('droppedBy', ParseUUIDPipe) droppedBy: string,
  ): Promise<void> {
    await this.beds.markDropSeen(userId, droppedBy);
  }

  @Get(':topicId/harvest')
  @ApiOperation({
    summary: 'What grew in a bed (S2 Bed harvest)',
    description:
      'Every planted word with its stage: fruit (mastered), ripe (Review), growing (the rest). ' +
      '`first_harvest` = no other bed was harvested before.',
  })
  async harvest(
    @CurrentUser('id') userId: string,
    @Param('topicId', ParseUUIDPipe) topicId: string,
  ): Promise<BedHarvest> {
    return this.beds.harvest(userId, topicId);
  }

  @Post()
  @ApiOperation({
    summary: 'Plant a seed packet: make a bed the active bed (S3)',
    description:
      'The bed being left becomes harvested when it had nothing left to plant, else resting.',
  })
  async plant(@CurrentUser('id') userId: string, @Body() dto: PlantBedDto): Promise<BedState> {
    return this.beds.plant(userId, dto.topic_id);
  }
}
