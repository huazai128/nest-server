import { isNumberString } from 'class-validator';
import { isObject } from 'lodash';

/**
 * 未知数据转Number
 * @export
 * @param {unknown} value
 * @return {*}  {(number | unknown)}
 */
export function unknownToNumber(value: unknown): number | unknown {
  return isNumberString(value) ? Number(value) : value;
}

/**
 * string 转 Object
 * @export
 * @param {string} value
 * @return {*}  {(Record<string, string> | string)}
 */
export function stringToObject(value: string): Record<string, string> | string {
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

/**
 * string 转 Object
 * @export
 * @param {string} value
 * @return {*}  {(Record<string, string> | string)}
 */
export function stringToObjectO(value: any): any {
  try {
    const data = JSON.parse(value);
    return isObject(data) ? data : stringToObjectO(data);
  } catch (error) {
    return value;
  }
}
