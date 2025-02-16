const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

const backupDir = path.join(process.env.BACKUP_DIR || '/app/backups');

// 确保备份目录存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `backup-${timestamp}`);

// MongoDB 备份命令
const cmd = `mongodump --uri="${config.db.uri}" --out="${backupPath}"`;

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`备份错误: ${error}`);
    return;
  }
  console.log(`备份成功: ${backupPath}`);

  // 删除旧备份（保留最近7天的备份）
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
  fs.readdir(backupDir, (err, files) => {
    if (err) {
      console.error(`读取备份目录失败: ${err}`);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`获取文件状态失败: ${err}`);
          return;
        }

        if (Date.now() - stats.mtime.getTime() > maxAge) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error(`删除旧备份失败: ${err}`);
            }
          });
        }
      });
    });
  });
}); 