#!/bin/bash
set -aue
PROTO_DIR=./proto
TS_DIR=./lib/codegen
PROTO_FILE=./proto/cluster.proto
PLUGIN_PATH=./node_modules/.bin/protoc-gen-ts_proto

echo "Generating ts server code"
protoc \
	-I=$PROTO_DIR \
	--plugin=$PLUGIN_PATH \
	--ts_proto_out=$TS_DIR --ts_proto_opt=env=node,outputServices=grpc-js,outputIndex=true \
	$PROTO_FILE
