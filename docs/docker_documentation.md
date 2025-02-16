# 停止并删除现有容器
docker stop volunteer-system
docker rm volunteer-system

# 清理构建缓存
docker builder prune -f

# 重新构建镜像
docker build --no-cache -t volunteer-system .

# 运行新容器
docker run -d \
  --name volunteer-system \
  -p 3000:3000 \
  -e MONGO_URI="mongodb://{UserName}:{Password}@localhost:27017/volunteer?authSource=admin" \
  -e JWT_SECRET="your_jwt_secret_key_volunteer_system" \
  -e NODE_ENV="production" \
  -v /mnt/user/appdata/node-app:/app \
  --restart unless-stopped \
  volunteer-system

# 查看容器日志
docker logs -f volunteer-system