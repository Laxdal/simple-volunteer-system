# 义工时数管理系统

一个基于 Node.js 和 Express 的义工时数管理系统，用于跟踪和管理志愿者的参与活动和服务时长。

## 功能特性

- 用户认证与授权
  - JWT based 认证
  - 角色基础访问控制（管理员/志愿者）
  
- 活动管理
  - 创建和管理义工活动
  - 活动状态跟踪
  - 位置验证
  - 签到/签退功能
  
- 时数统计
  - 自动计算义工时数
  - 实时更新排行榜
  - 个人统计数据
  
- 数据导出
  - 用户数据导出
  - 活动数据导出
  - 系统日志导出

## 技术栈

- Backend: Node.js + Express.js
- Database: MongoDB + Mongoose ODM
- Authentication: JSON Web Tokens (JWT)
- Frontend: HTML + CSS + JavaScript
- Containerization: Docker

## 安装说明

1. 克隆仓库
```bash
git clone https://github.com/Laxdal/simple-volunteer-system.git
cd volunteer-system
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，设置必要的环境变量
```

4. 启动服务器
```bash
npm start
```

或使用 Docker:
```bash
docker-compose up -d
```

## 环境要求

- Node.js >= 18
- MongoDB >= 4.4
- Docker (可选)

## API 文档

API 文档位于 `docs/api_documentation.md`

## 开发指南

1. 分支管理
   - main: 生产环境分支
   - develop: 开发环境分支
   - feature/*: 新功能分支
   - bugfix/*: 错误修复分支

2. 提交规范
   - feat: 新功能
   - fix: 修复问题
   - docs: 文档修改
   - style: 代码格式修改
   - refactor: 代码重构
   - test: 测试用例修改
   - chore: 其他修改

## 测试

```bash
npm test
```

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情
