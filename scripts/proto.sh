#!/bin/bash

PROTO_DIR="./src/protos" 

rm -rf "$PROTO_DIR"

cd ./src

git clone https://github.com/huazai128/protos-file.git

mv ./protos-file/protos ./

rm -rf ./protos-file





