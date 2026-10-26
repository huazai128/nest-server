import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PaginateOptions, PipelineStage } from 'mongoose';
import { isUndefined } from 'lodash';
import { NetworkSpeedLogService } from './networkSpeedLog.service';

@Controller('network-speed-log')
export class NetworkSpeedLogController {
  constructor(
    private readonly networkSpeedLogService: NetworkSpeedLogService,
  ) {}

  @GrpcMethod('NetworkSpeedLogService', 'getList')
  async getList(query: any) {
    const { page, size, sort } = query;
    const paginateOptions: PaginateOptions = {
      page: page || 1,
      limit: size || 20,
      sort: !isUndefined(sort) ? { _id: sort } : { _id: -1 },
    };
    const match = this.networkSpeedLogService.buildMatch(query);
    const result = await this.networkSpeedLogService.paginate(
      match,
      paginateOptions,
    );
    return {
      data: (result.docs || []).map((doc) => {
        const plain =
          typeof (doc as any).toObject === 'function'
            ? (doc as any).toObject()
            : doc;
        return this.networkSpeedLogService.formatListItem(plain);
      }),
      pagination: {
        totalDocs: result.totalDocs ?? 0,
        limit: result.limit ?? 0,
        totalPages: result.totalPages ?? 0,
        page: result.page ?? 1,
        pagingCounter: result.pagingCounter ?? 0,
        hasPrevPage: result.hasPrevPage ?? false,
        hasNextPage: result.hasNextPage ?? false,
        prevPage: result.prevPage ?? 0,
        nextPage: result.nextPage ?? 0,
      },
    };
  }

  @GrpcMethod('NetworkSpeedLogService', 'getChart')
  async getChart(query: any) {
    const match = this.networkSpeedLogService.buildMatch(query);
    const pipe: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: {
            $subtract: [
              { $subtract: ['$create_at', new Date(0)] },
              {
                $mod: [
                  { $subtract: ['$create_at', new Date(0)] },
                  Number(query.timeSlot) || 60 * 1000,
                ],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
          startTime: { $add: [new Date(0), '$_id'] },
        },
      },
      { $sort: { startTime: 1 } },
    ];
    const data = await this.networkSpeedLogService.aggregation(pipe);
    return { data };
  }
}
