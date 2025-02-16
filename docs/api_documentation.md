# 义工时数管理系统 API 文档

## 项目简介

义工时数管理系统是一个基于 Node.js 和 Express 构建的 Web 应用，用于管理义工的活动参与和时数记录。系统提供用户认证、活动管理、签到签退、数据统计等功能。

## 技术架构

### 后端架构

- **运行环境**: Node.js

- **Web 框架**: Express.js

- **数据库**: MongoDB

- **认证方式**: JWT (JSON Web Tokens)

- **API 风格**: RESTful

### 主要依赖

- `express`: Web 应用框架

- `mongoose`: MongoDB 对象模型工具

- `jsonwebtoken`: JWT 认证

- `bcryptjs`: 密码加密

- `cors`: 跨域资源共享

- `helmet`: 安全中间件

- `express-rate-limit`: 请求速率限制

### 目录结构

```
/

├── src/

│ ├── config/ # 配置文件

│ ├── models/ # 数据模型

│ ├── routes/ # 路由处理

│ ├── middleware/ # 中间件

│ └── app.js # 应用入口

├── public/ # 静态文件

└── docs/ # 文档
```

## API 端点

### 认证相关 API

#### 1. 用户注册

- **端点**: `/api/auth/register`

- **方法**: `POST`

- **描述**: 创建新用户账号

- **需要认证**: 否

**请求体：**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "name": "测试用户",
  "gender": "male",
  "birthday": "1990-01-01",
  "phone": "13800138000",
  "address": {
    "street": "示例街道",
    "city": "示例城市",
    "state": "示例省份",
    "zipCode": "100000"
  },
  "languages": ["Chinese", "English"]
}
```

**成功响应：**
```json
{
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "65cb7e8e...",
    "username": "testuser",
    "email": "test@example.com",
    "name": "测试用户",
    "role": "volunteer"
  }
}
```

#### 2. 用户登录

- **端点**: `/api/auth/login`

- **方法**: `POST`

- **描述**: 用户登录并获取认证令牌

- **需要认证**: 否

**请求体：**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**成功响应：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "65cb7e8e...",
    "username": "testuser",
    "name": "测试用户",
    "role": "volunteer"
  }
}
```

#### 3. 获取用户信息

- **端点**: `/api/auth/me`

- **方法**: `GET`

- **描述**: 获取当前登录用户信息

- **需要认证**: 是

**成功响应：**
```json
{
  "id": "65cb7e8e...",
  "username": "testuser",
  "email": "test@example.com",
  "name": "测试用户",
  "role": "volunteer",
  "gender": "male",
  "birthday": "1990-01-01",
  "totalParticipationHours": 10.5
}
```

#### 4. 修改密码

- **端点**: `/api/auth/change-password`

- **方法**: `POST`

- **描述**: 修改当前用户密码

- **需要认证**: 是

**请求体：**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

### 活动相关 API

#### 1. 获取活动列表

- **端点**: `/api/activities`

- **方法**: `GET`

- **描述**: 获取活动列表，支持分页和筛选

- **需要认证**: 否

**查询参数：**
- `status`: 活动状态 (published/draft/cancelled/completed)，默认为 "published"
- `timeStatus`: 时间状态 (upcoming/ongoing/past)，可选
- `page`: 页码，默认为 1
- `limit`: 每页数量，默认为 10
- `latitude`: 纬度（可选，用于查询附近活动）
- `longitude`: 经度（可选，与latitude一起使用）
- `distance`: 距离范围（米，可选，默认5000）
- `location`: 地点名称（可选）

**注意：** 
- 如果提供了 `latitude` 和 `longitude`，系统将返回指定范围内的活动
- 如果提供了 `location`，系统将返回指定地点的活动
- 如果都未提供，系统将返回符合状态筛选的所有活动

**成功响应：**
```json
{
  "activities": [
    {
      "id": "65cb7e8e...",
      "name": "活动名称",
      "description": "活动描述",
      "location": {
        "name": "活动地点",
        "coordinates": {
          "type": "Point",
          "coordinates": [116.4074, 39.9042]
        }
      },
      "status": "published",
      "maxParticipants": 50,
      "currentParticipants": 10,
      "startTime": "2024-02-20T09:00:00Z",
      "endTime": "2024-02-20T17:00:00Z"
    }
  ],
  "page": 1,
  "totalPages": 5,
  "total": 100
}
```

#### 2. 创建活动

- **端点**: `/api/activities`

- **方法**: `POST`

- **描述**: 创建新活动

- **需要认证**: 是

- **需要权限**: admin

**请求体：**
```json
{
  "name": "活动名称",
  "description": "活动描述",
  "location": {
    "name": "活动地点",
    "coordinates": {
      "type": "Point",
      "coordinates": [116.4074, 39.9042]
    },
    "range": 100,
    "requireLocation": true
  },
  "contactPerson": {
    "name": "联系人",
    "phone": "13800138000",
    "email": "contact@example.com"
  },
  "maxParticipants": 50,
  "startTime": "2024-02-20T09:00:00Z",
  "endTime": "2024-02-20T17:00:00Z"
}
```

#### 3. 更新活动状态

- **端点**: `/api/activities/:id/status`

- **方法**: `PATCH`

- **描述**: 更新活动状态

- **需要认证**: 是

- **需要权限**: admin

**请求体：**
```json
{
  "status": "published"
}
```

### 参与记录相关 API

#### 1. 获取用户参与记录

- **端点**: `/api/participations/my`

- **方法**: `GET`

- **描述**: 获取当前用户的所有参与记录

- **需要认证**: 是

**成功响应：**
```json
[
  {
    "id": "65cb7e8e...",
    "activity": {
      "id": "65cb7e8e...",
      "name": "活动名称",
      "description": "活动描述",
      "startTime": "2024-02-20T09:00:00Z",
      "endTime": "2024-02-20T17:00:00Z"
    },
    "status": "completed",
    "participationHours": 8,
    "checkIn": {
      "time": "2024-02-20T09:00:00Z",
      "location": {
        "type": "Point",
        "coordinates": [116.4074, 39.9042]
      }
    },
    "checkOut": {
      "time": "2024-02-20T17:00:00Z",
      "location": {
        "type": "Point",
        "coordinates": [116.4074, 39.9042]
      }
    }
  }
]
```

#### 2. 报名活动

- **端点**: `/api/participations/:activityId/register`

- **方法**: `POST`

- **描述**: 报名参加活动

- **需要认证**: 是

- **参数说明**: activityId 为活动ID

**响应说明：**
- 如果活动不存在，返回 404
- 如果活动未发布，返回 400
- 如果已经报名，返回 400
- 如果人数已满，返回 400

**成功响应：**
```json
{
  "id": "65cb7e8e...",
  "activity": "65cb7e8e...",
  "user": "65cb7e8e...",
  "status": "registered",
  "registrationTime": "2024-02-13T10:00:00Z"
}
```

#### 3. 签到

- **端点**: `/api/participations/:activityId/check-in`

- **方法**: `POST`

- **描述**: 活动签到

- **需要认证**: 是

**请求体：**
```json
{
  "latitude": 39.9042,
  "longitude": 116.4074,
  "device": "设备信息"
}
```

**响应说明：**
- 如果活动要求位置验证但未提供位置，返回 400
- 如果不在签到时间范围内，返回 400
- 如果不在允许的签到范围内，返回 400

**成功响应：**
```json
{
  "id": "65cb7e8e...",
  "activity": "65cb7e8e...",
  "user": "65cb7e8e...",
  "status": "checked-in",
  "checkInTime": "2024-02-13T10:00:00Z"
}
```

#### 4. 签退

- **端点**: `/api/participations/:activityId/check-out`

- **方法**: `POST`

- **描述**: 活动签退

- **需要认证**: 是

**请求体：**
```json
{
  "latitude": 39.9042,
  "longitude": 116.4074
}
```

**响应说明：**
- 如果未签到，返回 400
- 签退成功后会自动计算参与时长

**成功响应：**
```json
{
  "id": "65cb7e8e...",
  "activity": "65cb7e8e...",
  "user": "65cb7e8e...",
  "status": "checked-out",
  "checkOutTime": "2024-02-13T17:00:00Z"
}
```

### 排行榜相关 API

#### 1. 获取公开排行榜

- **端点**: `/api/rankings/public`

- **方法**: `GET`

- **描述**: 获取公开排行榜（仅显示基本信息）

- **需要认证**: 否

**查询参数：**
- `page`: 页码，默认为 1
- `limit`: 每页数量，默认为 20

**成功响应：**
```json
{
  "rankings": [
    {
      "rank": 1,
      "username": "testuser",
      "totalHours": 100.5
    }
  ],
  "page": 1,
  "totalPages": 5,
  "total": 100
}
```

#### 2. 获取详细排行榜

- **端点**: `/api/rankings`

- **方法**: `GET`

- **描述**: 获取详细排行榜（包含更多信息）

- **需要认证**: 是

**查询参数：**
- `page`: 页码，默认为 1
- `limit`: 每页数量，默认为 20

**成功响应：**
```json
{
  "rankings": [
    {
      "rank": 1,
      "username": "testuser",
      "totalHours": 100.5,
      "participationCount": 20,
      "age": 25,
      "lastActivityDate": "2024-02-13"
    }
  ],
  "page": 1,
  "totalPages": 5,
  "total": 100
}
```

#### 3. 获取用户详细统计

- **端点**: `/api/rankings/user/:userId`

- **方法**: `GET`

- **描述**: 获取指定用户的详细统计信息（仅能查看自己的）

- **需要认证**: 是

- **参数说明**: userId 必须与当前登录用户ID相同

**成功响应：**
```json
{
  "username": "testuser",
  "age": 25,
  "totalHours": 100.5,
  "participationCount": 20,
  "rank": 1,
  "lastActivityDate": "2024-02-13"
}
```

### 管理员 API

#### 1. 获取用户列表

- **端点**: `/api/admin/users`

- **方法**: `GET`

- **描述**: 获取所有用户列表（包含统计信息）

- **需要认证**: 是

- **需要权限**: admin

**查询参数：**
- `page`: 页码，默认为 1
- `limit`: 每页数量，默认为 20

**成功响应：**
```json
{
  "users": [
    {
      "id": "65cb7e8e...",
      "username": "testuser",
      "email": "test@example.com",
      "role": "volunteer",
      "stats": {
        "totalHours": 100.5,
        "participationCount": 20,
        "rank": 1,
        "lastActivityDate": "2024-02-13"
      }
    }
  ],
  "page": 1,
  "totalPages": 5,
  "total": 100
}
```

#### 2. 获取用户详情

- **端点**: `/api/admin/users/:userId`

- **方法**: `GET`

- **描述**: 获取指定用户的详细信息

- **需要认证**: 是

- **需要权限**: admin

**成功响应：**
```json
{
  "id": "65cb7e8e...",
  "username": "testuser",
  "email": "test@example.com",
  "role": "volunteer",
  "gender": "male",
  "age": 25,
  "stats": {
    "totalHours": 100.5,
    "participationCount": 20,
    "rank": 1,
    "lastActivityDate": "2024-02-13"
  }
}
```

#### 3. 更新用户角色

- **端点**: `/api/admin/users/:userId/role`

- **方法**: `PATCH`

- **描述**: 更新用户角色

- **需要认证**: 是

- **需要权限**: admin

**请求体：**
```json
{
  "role": "admin"
}
```

### 日志管理 API

#### 1. 导出系统日志

- **端点**: `/api/admin/logs/export`
- **方法**: `GET`
- **描述**: 导出指定时间范围和类型的系统日志
- **需要认证**: 是
- **需要权限**: admin

**查询参数：**
- `startDate`: 开始日期 (YYYY-MM-DD)，必需
- `endDate`: 结束日期 (YYYY-MM-DD)，必需
- `type`: 日志类型 (info|error|export)，默认为 info
- `format`: 导出格式 (csv|json)，默认为 csv

**成功响应：**
- 如果 format=csv：
  ```
  Content-Type: text/csv; charset=utf-8
  Content-Disposition: attachment; filename=logs-info-2024-02-14-to-2024-02-15.csv
  
  timestamp,level,message,userId,action,ip,userAgent,...
  ```

- 如果 format=json：
  ```json
  Content-Type: application/json
  Content-Disposition: attachment; filename=logs-info-2024-02-14-to-2024-02-15.json
  
  [
    {
      "timestamp": "2024-02-14T10:00:00.000Z",
      "level": "info",
      "message": "User Activity",
      "userId": "...",
      "action": "...",
      "details": {
        "ip": "...",
        "userAgent": "...",
        "method": "...",
        "path": "..."
      }
    }
  ]
  ```

**错误响应：**
```json
{
  "message": "开始日期和结束日期是必需的"
}
```
或
```json
{
  "message": "无效的日志类型"
}
```

### 日志类型说明

1. **普通日志 (info)**
   - 用户活动记录
   - 系统事件
   - 性能指标
   - 导出操作记录

2. **错误日志 (error)**
   - 系统错误
   - API调用错误
   - 数据库错误
   - 验证错误

3. **导出日志 (export)**
   - 数据导出记录
   - 导出操作详情
   - 导出结果统计

### 日志字段说明

1. **通用字段**
   - `timestamp`: 日志记录时间
   - `level`: 日志级别 (info/error/warn)
   - `message`: 日志消息

2. **用户活动日志**
   - `userId`: 用户ID
   - `action`: 操作类型
   - `ip`: 客户端IP
   - `userAgent`: 客户端信息
   - `method`: HTTP方法
   - `path`: 请求路径
   - `query`: 查询参数
   - `body`: 请求体（敏感信息已过滤）

3. **错误日志**
   - `error`: 错误消息
   - `stack`: 错误堆栈（仅在开发环境）
   - `context`: 错误上下文信息

4. **导出日志**
   - `exportType`: 导出类型
   - `filters`: 导出过滤条件
   - `recordCount`: 导出记录数量

### 安全说明

1. **访问控制**
   - 仅管理员可以访问日志API
   - 日志导出操作会被记录
   - 支持按时间范围限制导出

2. **数据安全**
   - 敏感信息在记录前会被过滤
   - 密码等关键信息不会被记录
   - 支持日志文件加密（可选）

3. **性能考虑**
   - 日志文件按日期自动轮转
   - 支持日志文件大小限制
   - 支持日志保留期限设置

## 错误响应

**所有 API 在发生错误时会返回统一格式的错误响应：**

```json
{
  "message": "错误描述信息",
  "details": "详细错误信息（仅在开发环境）"
}
```

**常见 HTTP 状态码：**

- `200`: 请求成功

- `201`: 创建成功

- `400`: 请求参数错误

- `401`: 未认证或认证失败

- `403`: 权限不足

- `404`: 资源不存在

- `500`: 服务器内部错误

## 安全性说明

1. **认证机制**
   - 使用 JWT (JSON Web Token) 进行认证
   - Token 有效期为 24 小时
   - 请求头格式：`Authorization: Bearer <token>`

2. **密码安全**
   - 使用 bcrypt 进行密码加密
   - 密码强度要求：至少8个字符，包含大小写字母和数字

3. **请求限制**
   - 使用 express-rate-limit 限制请求频率
   - 每个 IP 15分钟内最多 100 个请求
   - 超出限制返回 429 状态码

4. **数据验证**
   - 所有输入数据经过验证和清理
   - 使用 mongoose schema 验证数据格式
   - 特殊字符和HTML标签会被转义

5. **位置信息安全**
   - 签到时的位置验证
   - 支持范围限制和精确定位
   - 位置信息仅在必要时使用

6. **错误处理**
   - 统一的错误响应格式
   - 生产环境不暴露敏感错误信息
   - 所有错误都有日志记录

7. **HTTPS**
   - 所有API通信使用HTTPS加密
   - 使用 TLS 1.2 或更高版本
   - 启用 HSTS

8. **其他安全措施**
   - 使用 helmet 增强 HTTP 安全头
   - CORS 策略限制
   - XSS 和 CSRF 防护
   - SQL 注入防护