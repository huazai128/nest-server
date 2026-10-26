import { Observable } from 'rxjs';
import { ChartList } from './log';
import { QueryDTO } from './common/query_dto';
import { Pagination } from './common/pagination';

export interface NetworkSpeedLogList {
  data: Array<{ [key: string]: any }>;
  pagination: Pagination | undefined;
}

export interface NetworkSpeedLogService {
  getList(request: QueryDTO): Observable<NetworkSpeedLogList>;
  getChart(request: QueryDTO): Observable<ChartList>;
}
