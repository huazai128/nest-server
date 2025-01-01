export const CACHE_PREFIX = '__site-info_';

export const getSiteCacheKey = (key: string) => {
  return `${CACHE_PREFIX}-id-${key}`;
};
