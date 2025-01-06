#!/bin/bash

PROTO_DIR="./src/protos" 
PROTOS_FILE_REPO="https://github.com/huazai128/protos-file.git"

# 检查是否存在 protos 目录
if [ -d "$PROTO_DIR" ]; then
  # 如果存在，清空其中的所有内容
  rm -rf "$PROTO_DIR/*"
else
  # 如果不存在，创建 protos 目录
  mkdir -p "$PROTO_DIR"
fi

# 克隆仓库到临时目录
TEMP_DIR="./src/protos-temp"
git clone "$PROTOS_FILE_REPO" "$TEMP_DIR"

# 使用 rsync 来移动所有内容到目标目录，包括子目录中的 .proto 和 .ts 文件
if [ -d "$TEMP_DIR/protos" ]; then
  rsync -a "$TEMP_DIR/protos/" "$PROTO_DIR/"
else
  echo "没有找到 protos 目录"
fi

# 删除临时目录
rm -rf "$TEMP_DIR"