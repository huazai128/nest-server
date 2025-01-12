import * as dayjs from 'dayjs';

// 递归地将对象中的 Date 字段转换为 String
export function convertDatesToString(obj: any): any {
  if (obj instanceof Date) {
    return dayjs(obj).format('YYYY-MM-DD HH:mm:ss');
  } else if (Array.isArray(obj)) {
    return obj.map((item) => convertDatesToString(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertDatesToString(obj[key]);
    }
    return result;
  }
  return obj;
}
