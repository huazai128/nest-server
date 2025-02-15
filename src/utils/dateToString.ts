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

/**
 * 将数组中的 Date 字段转换为 String
 * @export
 * @param {any[]} arr
 * @return {*}  {any[]}
 */
export function convertArrayDatesToString(arr: any[]): any[] {
  return arr.map((item) => {
    if (item.doce) {
      return {
        ...item.toObject(),
        create_at: dayjs(item.create_at).format('YYYY-MM-DD HH:mm:ss'),
        update_at: dayjs(item.update_at).format('YYYY-MM-DD HH:mm:ss'),
      };
    }
    return {
      ...item.toObject(),
      create_at: dayjs(item.create_at).format('YYYY-MM-DD HH:mm:ss'),
      update_at: dayjs(item.update_at).format('YYYY-MM-DD HH:mm:ss'),
    };
  });
}
