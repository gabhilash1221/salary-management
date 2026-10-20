import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { resolvePagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditQuery = {
  employeeId?: string;
  actorUserId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditQuery) {
    const pagination = resolvePagination(query.page ?? 1, query.pageSize ?? 25);
    const where: Prisma.AuditLogWhereInput = {};
    if (query.employeeId) where.entityId = query.employeeId;
    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.action) where.action = query.action;
    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from)
        where.timestamp.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) where.timestamp.lte = new Date(`${query.to}T23:59:59.999Z`);
    }
    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        timestamp: item.timestamp.toISOString(),
        oldValue: parseJson(item.oldValue),
        newValue: parseJson(item.newValue),
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
