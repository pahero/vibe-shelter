export type ArchivationReasonDto = {
  id: string;
  name: string;
};

export type MutationResultDto = {
  id: string;
};

export function validateArchivationReasonName(name: string): string {
  const normalized = name?.trim();
  if (!normalized) throw new BadRequestException('Archivation reason name is required');
  if (normalized.length > 100) throw new BadRequestException('Archivation reason name must be at most 100 characters');
  return normalized;
}
import { BadRequestException } from '@nestjs/common';
