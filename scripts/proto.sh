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

# 移动文件到目标目录，覆盖同名文件
mv "$TEMP_DIR/protos/"* "$PROTO_DIR/"

# 删除临时目录
rm -rf "$TEMP_DIR"