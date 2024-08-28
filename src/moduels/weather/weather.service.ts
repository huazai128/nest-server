import { Injectable, OnModuleInit } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { provsMap, cityMap, areaMap } from './data';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import { join } from 'path';

const headers: any[] = [
  { id: 'city', title: '城市' },
  { id: 'time', title: '日期' },
  { id: 'high', title: '最高气温' },
  { id: 'low', title: '最低气温' },
  { id: 'weather', title: '天气' },
  { id: 'dayWeather', title: '白天天气' },
  { id: 'nightWeather', title: '晚上天气' },
  { id: 'wind', title: '风力风向' },
  { id: 'windScale', title: '风级' },
  { id: 'quality', title: '空气质量' },
];
let csvWriter = createObjectCsvWriter({
  path: 'output8-2.csv',
  header: headers,
});
const outCsv = createObjectCsvWriter({
  path: '2023年.csv',
  header: headers,
});

const fieldMapping = {
  城市: 'city',
  日期: 'time',
  最高气温: 'high',
  最低气温: 'low',
  天气: 'weather',
  白天天气: 'dayWeather',
  晚上天气: 'nightWeather',
  风力风向: 'wind',
  风级: 'windScale',
  空气质量: 'quality',
};
@Injectable()
export class WeatherService implements OnModuleInit {
  private map = new Map<string, string>();
  private startMonth = 7;
  private isStart = false;
  private curKey: string;
  private num = 6;
  async onModuleInit() {
    for (const [key, value] of provsMap.entries()) {
      const provName = value.split(' ')[1];
      const cityStr = cityMap.get(key);
      const cityList = cityStr.split('|');
      const areaList = areaMap.get(key);
      cityList.forEach((item) => {
        const list = item.split(' ') || [];
        const cityName = list?.[1].split('-')[0];
        const cKey = list[0];
        let areaStr = areaList.find((item) => item.includes(cKey));
        if (!areaStr) {
          areaStr = areaList.find((item) => item.includes(provName));
        }
        if (provName === '台湾') {
          areaStr = areaList.find((item) => item.includes('高雄'));
        }
        const aList = areaStr.split('|');
        aList.forEach((str) => {
          const arList = str.split(' ') || [];
          const areaName = arList?.[1]?.split?.('-')?.[0];
          const aKey = arList?.[0]?.split?.('-')?.[0];
          this.map.set(aKey, `${provName}-${cityName}-${areaName}`);
        });
      });
    }
    // const files = join(__dirname, '../../../../csv');
    // this.mergeCsvFiles(files);
    // console.log(files);
    // this.getInit();
  }

  async mergeCsvFiles(directoryPath: string): Promise<void> {
    const files = fs.readdirSync(directoryPath);
    let indx = 0;
    const results = [];

    for (const file of files) {
      if (file.endsWith('.csv')) {
        const filePath = `${directoryPath}/${file}`;
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (data) => {
            const newData = {};
            Object.keys(data).forEach((key) => {
              if (fieldMapping[key]) {
                newData[fieldMapping[key]] = data[key];
              }
            });
            console.log(newData, 'newData');
            results.push(newData);
          })
          .on('end', () => {
            indx = indx + 1;
            if (indx === files.length) {
              outCsv.writeRecords(results);
            }
          });
      }
    }

    // outputStream.end();
  }

  async getInit() {
    for (const [key, value] of this.map.entries()) {
      this.curKey = key;
      if (key === '53915' || this.isStart) {
        if (key === '53915') {
          this.isStart = true;
          // this.startMonth = 6;
        }
        if (key === '53915') {
          this.isStart = false;
        }
        console.log(key, value, ':=');
        await this.getTask(
          `https://tianqi.2345.com/wea_history/${key}.htm`,
          value,
        );
      }
      // console.log(key, value, ':=');
      // await this.getTask(
      //   `https://tianqi.2345.com/wea_history/${key}.htm`,
      //   value,
      // );
    }
  }

  getTask(url: string, cityName: string) {
    // 启动chrome浏览器
    return new Promise<any>(async (resolve, reject) => {
      while (this.startMonth > 0) {
        await this.getBrowser(url, cityName);
        this.startMonth = this.startMonth - 1;
      }
      console.log(this.startMonth, 'startMonth');
      this.startMonth = 8;
      // await this.getBrowser(url, cityName);
      resolve(true);
    });
  }

  async getBrowser(url: string, cityName: string) {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const browser = await puppeteer.launch();
        // 创建一个新页面
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', (interceptedRequest) => {
          // 拦截目标接口的 GET 请求
          if (
            interceptedRequest.method() === 'GET' &&
            interceptedRequest.url().includes('Pc/GetHistory')
          ) {
            // 获取请求的 URL
            const url = new URL(interceptedRequest.url());
            // 修改请求参数
            url.searchParams.set('date[month]', this.startMonth + '');
            // 修改后的 URL 重新发起请求
            interceptedRequest.continue({
              url: url.toString(),
            });
            // 也可以在这里获取接口数据
          } else {
            interceptedRequest.continue();
          }
        });

        // 页面指向指定网址
        await page.goto(url);

        setTimeout(async () => {
          const inputElement = await page.$('table.history-table');
          const value = await page.evaluate(
            (node) => node.innerText,
            inputElement,
          );
          const weatherArray = value
            .split('\n')
            .map((item) => item.split('\t'))
            .filter((item, index) => index !== 0)
            .map((item) => {
              const list = item[3].split('~');
              const wList = item[4].split('风');
              return {
                city: cityName,
                time: item[0],
                high: item[1],
                low: item[2],
                weather: item[3],
                dayWeather: list[0],
                nightWeather: list[list.length - 1],
                wind: (wList?.[0] && `${wList?.[0]}风`) || item[4],
                windScale: wList?.[1] || item[4],
                quality: item[5],
              };
            });

          csvWriter.writeRecords(weatherArray);
          await browser.close();
          resolve(true);
        }, 3000);
      } catch (error) {
        console.log(error);
        this.num = this.num + 1;
        csvWriter = createObjectCsvWriter({
          path: `output${this.num}.csv`,
          header: [
            { id: 'name', title: 'Name' },
            { id: 'age', title: 'Age' },
          ],
        });
        this.getBrowser(url, cityName);
      }
    });
  }
}
