export enum SortType {
  Asc = 1, // 升序
  Desc = -1, // 降序
}

export enum PublishState {
  Draft = 0, // 草稿
  Published = 1, // 已发布
  Recycle = -1, // 回收站
}

export enum ReportStatus {
  NotReport = 0, // API 不上报告警
  Report = 1, //  API 接口异常上报告警
}
