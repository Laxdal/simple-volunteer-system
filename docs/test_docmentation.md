# 测试数据生成脚本文档

## 概述

测试数据生成脚本(`src/scripts/generateTestData.js`)用于创建模拟的用户、活动和参与记录数据，以便于开发和测试。该脚本会生成一组相互关联的测试数据，包括用户账号、活动记录、参与记录以及用户统计信息。

## 运行方法

### 前提条件

1. 确保MongoDB服务器正在运行
2. 确保环境变量`MONGO_URI`已正确设置（默认值：`mongodb://{UserName}:{Password}@localhost:27017/volunteer?authSource=admin`）

### 执行脚本

先进入容器：

```bash
docker exec -it volunteer-system /bin/sh
```

然后运行脚本：

```bash
npm run generate-test-data
```

或直接使用Node.js运行：

```bash
node src/scripts/generateTestData.js
```

## 数据生成详情

### 1. 用户数据 (50个测试用户)

- 用户名格式：`test_user_1` 到 `test_user_50`
- 邮箱格式：`test_user_X@test.com`
- 默认密码：`password123`
- 随机生成的属性：
  - 性别：随机分配男/女
  - 生日：随机生成（确保年龄在18-60岁之间）
  - 加入日期：随机生成（2023年1月1日之后）
  - 角色：默认为`volunteer`
  - 状态：默认为`active`

### 2. 活动数据 (20个测试活动)

- 活动名称格式：`test_activity_1` 到 `test_activity_20`
- 时间安排：
  - 开始时间：从当前日期往前推，每个活动间隔2天
  - 开始时间范围：上午8点到12点之间
  - 持续时间：4-8小时
- 位置验证配置：
  - 60%的活动需要位置验证
  - 验证范围：100米
  - 随机生成的经纬度（基于30°N, 120°E）
- 签到配置：
  - 70%的活动需要提前签到限制
  - 提前签到时间：3小时
- 参与人数限制：
  - 最大参与人数：50人
  - 当前参与人数：根据实际参与记录动态更新

### 3. 参与记录生成

- 每个用户随机参与3-10个活动
- 签到时间生成规则：
  - 需要提前签到的活动：在允许的提前时间范围内随机生成
  - 不需要提前签到的活动：在活动期间随机生成
- 签退时间生成规则：
  - 确保在签到时间至少1小时之后
  - 确保在活动结束前
- 位置信息生成：
  - 仅为需要位置验证的活动生成
  - 在活动地点周围100米范围内随机生成

### 4. 统计信息更新

- 为每个用户更新总参与时长
- 更新参与活动次数
- 计算并更新排名信息
- 记录最近参与的活动信息

#### 自动更新机制

统计信息会在以下情况自动更新：
1. 用户签退活动时（完成参与）
2. 系统每小时自动检查过期的统计信息
3. 生成测试数据时

#### 手动更新方式

可以通过以下命令手动更新统计信息：

1. 使用专门的更新脚本：
```bash
npm run update-stats
```

2. 通过生成测试数据（会同时更新统计）：
```bash
npm run generate-test-data
```

3. 通过管理员API：
```bash
curl -X POST https://{YOUR_DOMAIN}/api/rankings/update \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 更新频率
- 默认每条统计信息的更新周期为1小时
- 可以通过修改 UserStats 模型中的 `nextUpdateDue` 字段调整更新频率
- 建议在生产环境中设置定时任务定期运行 `update-stats`

#### 统计信息验证
更新完成后，可以通过以下方式验证：
1. 检查管理员界面的用户列表中的时长显示
2. 查看排行榜数据是否正确更新
3. 验证个人用户统计信息的准确性
4. 检查脚本输出的前10名用户排名

## 数据清理

脚本执行前会自动清理以下数据：
- 用户名以 `test_user_` 开头的用户记录
- 活动名称以 `test_activity_` 开头的活动记录
- 所有参与记录
- 所有用户统计信息

## 输出信息

脚本执行过程中会输出以下信息：
1. MongoDB连接状态
2. 创建的测试用户数量
3. 创建的测试活动数量
4. 创建的参与记录数量
5. 排行榜前10名用户及其时长

## 注意事项

1. 该脚本会删除现有的测试数据，请勿在生产环境中运行
2. 确保数据库有足够的存储空间
3. 脚本执行时间可能需要几分钟，取决于服务器性能
4. 生成的数据仅用于测试目的，不应用于生产环境

## 数据验证

生成数据后，可以通过以下方式验证：

1. 通过管理员界面查看用户列表
2. 检查排行榜功能
3. 查看活动列表和参与记录
4. 验证用户统计信息

## 常见问题

1. 如果遇到连接错误，检查MongoDB连接字符串
2. 如果数据生成不完整，检查数据库权限
3. 如果需要修改生成的数据量，可以调整脚本中的`totalUsers`和`totalActivities`变量

## 开发者说明

如需修改生成的数据特征，可以调整以下参数：

1. 用户数量：修改`totalUsers`变量
2. 活动数量：修改`totalActivities`变量
3. 参与记录数量：修改`participationCount`的范围
4. 活动时间范围：修改`startTime`的计算逻辑
5. 位置验证概率：修改`requireLocation`的概率值
6. 提前签到要求：修改`requireEarlyCheckIn`的概率值
