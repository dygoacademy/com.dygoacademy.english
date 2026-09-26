import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** The caller's language settings, as `PATCH /profiles/me` returns them. */
export interface ProfileLanguage {
  id: string;
  ui_locale: string | null;
  meaning_locale: string | null;
}

/**
 * The caller's own profile preferences (UI-L; the Phase 11 WS1 preference
 * work). Every query runs through `queryAs`, so `profiles_update_self`
 * (RLS) limits the update to the caller's own row.
 */
@Injectable()
export class ProfilesService {
  constructor(private readonly db: DatabaseService) {}

  async updateMine(userId: string, dto: UpdateProfileDto): Promise<ProfileLanguage> {
    // Only the fields that were sent: undefined = keep, null = clear.
    const sets: string[] = [];
    const params: unknown[] = [userId];
    if (dto.uiLocale !== undefined) {
      params.push(dto.uiLocale);
      sets.push(`ui_locale = $${params.length}`);
    }
    if (dto.meaningLocale !== undefined) {
      params.push(dto.meaningLocale);
      sets.push(`meaning_locale = $${params.length}`);
    }
    if (sets.length === 0) {
      throw new BadRequestException('Send uiLocale and/or meaningLocale.');
    }

    const rows = await this.db.queryAs<ProfileLanguage>(
      userId,
      `update public.profiles
          set ${sets.join(', ')},
              updated_at = now()
        where id = $1
        returning id, ui_locale, meaning_locale`,
      params,
    );
    if (rows.length === 0) {
      throw new NotFoundException('Profile not found.');
    }
    return rows[0];
  }
}
