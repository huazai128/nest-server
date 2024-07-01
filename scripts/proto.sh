#!/bin/bash

PROTO_DIR="./src/protos"      # 相对路径指定 proto 文件路径
OUTPUT_DIR="./src/types"    # 相对路径指定输出目录

PROTOC_GEN_TS_PATH="./node_modules/.bin/protoc-gen-ts_proto"   # protoc-gen-ts_proto 插件路径

# rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

protoc \
  --plugin="protoc-gen-ts_proto=$PROTOC_GEN_TS_PATH" \
  --ts_proto_out="$OUTPUT_DIR" \
  --ts_proto_opt=esModuleInterop=true \
  -I "$PROTO_DIR" \
  "$PROTO_DIR"/*.proto