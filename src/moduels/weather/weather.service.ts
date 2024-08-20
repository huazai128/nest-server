/* eslint-disable prefer-rest-params */
import { Injectable, OnModuleInit } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { provsMap, cityMap, areaMap } from './data';

@Injectable()
export class WeatherService implements OnModuleInit {
  private map = new Map<string, string>();
  private startMonth = 8;
  onModuleInit() {
    for (const [key, value] of provsMap.entries()) {
      const provName = value.split(' ')[1];
      const cityStr = cityMap.get(key);
      const cityList = cityStr.split('|');
      const areaList = areaMap.get(key);
      cityList.forEach((item) => {
        const list = item.split(' ') || [];
        const cityName = list?.[1].split('-')[0];
        // console.log(cityName, 'cityName');
        const cKey = list[0];
        const areaStr = areaList.find((item) => item.includes(cKey)) || '';
        // console.log(areaStr);
        const aList = areaStr.split('|');
        // console.log(aList, 'aList');
        aList.forEach((str) => {
          const arList = str.split(' ') || [];
          const areaName = arList?.[1]?.split?.('-')?.[0];
          const aKey = arList?.[0]?.split?.('-')?.[0];
          // console.log(item, 'item');
          this.map.set(aKey, `${provName}-${cityName}-${areaName}`);
        });
      });
    }
    console.log(this.map);
  }

  async getBrowser(url: string) {
    // 启动chrome浏览器
    const browser = await puppeteer.launch();
    // 创建一个新页面
    const page = await browser.newPage();

    await page.evaluate(() => {
      const now = new Date(2024, 0, 1); // 2022年1月1日
      Date = class extends Date {
        constructor() {
          if (arguments.length === 0) {
            super(now);
          } else {
            super(...arguments);
          }
        }
      };
    });
    // 页面指向指定网址
    await page.goto(url);
    setTimeout(async () => {
      const inputElement = await page.$('table.history-table');
      const value = await page.evaluate((node) => node.innerText, inputElement);
      const weatherArray = value
        .split('\n')
        .map((item) => item.split('\t'))
        .filter((item, index) => index !== 0);

      console.log(weatherArray, 'value');
      await browser.close();
    }, 5000);
  }
}
