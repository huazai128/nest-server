export interface ConfigServer {
  // 用于微服务链接
  redisConf: {
    port: number;
    host: string;
    no_ready_check?: boolean;
    password?: string;
    defaultCacheTTL?: number;
    username?: string;
  };
  grpcUrl: string;
}
