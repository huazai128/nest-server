# Project Name

## 重要提示 ⚠️

**Node.js v22 兼容性警告**：
目前本项目在 Node.js v22 版本下存在编译问题。建议使用 Node.js v20 LTS 版本进行开发。
nodev22 版本运行这里会报错 issues: https://github.com/protobufjs/protobuf.js/issues/2025

## 项目描述

基于 Nest.js 框架开发的服务端应用，集成了以下主要技术栈：

- Nest.js - 企业级 Node.js Web 框架
- Mongoose/Typegoose - MongoDB ODM
- Redis - 缓存层
- gRPC - 微服务通信

## 系统要求

- Node.js v20 LTS（不推荐 v22）
- MongoDB 4.4+
- Redis 6+

## 安装

```bash
# 安装依赖
yarn install
```

## 环境配置

在项目根目录创建 `.env` 文件：

```env
# 应用配置
PORT=3000
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/your-database
REDIS_URL=redis://localhost:6379
```

## 运行

```bash
# 开发环境
yarn run start:dev

# 生产环境
yarn run start:prod
```

## 测试

```bash
# 单元测试
yarn run test

# E2E 测试
yarn run test:e2e

# 测试覆盖率
yarn run test:cov
```

## 项目结构

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
