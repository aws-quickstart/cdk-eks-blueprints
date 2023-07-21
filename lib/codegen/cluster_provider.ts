/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export interface AddClusterProviderRequest {
  clusterName: string;
  clusterProvider: ClusterProvider | undefined;
}

export interface ClusterProvider {
  asgClusterProvider?: AsgClusterProvider | undefined;
  mngClusterProvider?: MngClusterProvider | undefined;
}

export interface AsgClusterProvider {
  name?: string | undefined;
  version: string;
  id: string;
}

export interface MngClusterProvider {
  name?: string | undefined;
  version: string;
}

function createBaseAddClusterProviderRequest(): AddClusterProviderRequest {
  return { clusterName: "", clusterProvider: undefined };
}

export const AddClusterProviderRequest = {
  encode(message: AddClusterProviderRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.clusterName !== "") {
      writer.uint32(10).string(message.clusterName);
    }
    if (message.clusterProvider !== undefined) {
      ClusterProvider.encode(message.clusterProvider, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AddClusterProviderRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAddClusterProviderRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.clusterName = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.clusterProvider = ClusterProvider.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AddClusterProviderRequest {
    return {
      clusterName: isSet(object.clusterName) ? String(object.clusterName) : "",
      clusterProvider: isSet(object.clusterProvider) ? ClusterProvider.fromJSON(object.clusterProvider) : undefined,
    };
  },

  toJSON(message: AddClusterProviderRequest): unknown {
    const obj: any = {};
    if (message.clusterName !== "") {
      obj.clusterName = message.clusterName;
    }
    if (message.clusterProvider !== undefined) {
      obj.clusterProvider = ClusterProvider.toJSON(message.clusterProvider);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AddClusterProviderRequest>, I>>(base?: I): AddClusterProviderRequest {
    return AddClusterProviderRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<AddClusterProviderRequest>, I>>(object: I): AddClusterProviderRequest {
    const message = createBaseAddClusterProviderRequest();
    message.clusterName = object.clusterName ?? "";
    message.clusterProvider = (object.clusterProvider !== undefined && object.clusterProvider !== null)
      ? ClusterProvider.fromPartial(object.clusterProvider)
      : undefined;
    return message;
  },
};

function createBaseClusterProvider(): ClusterProvider {
  return { asgClusterProvider: undefined, mngClusterProvider: undefined };
}

export const ClusterProvider = {
  encode(message: ClusterProvider, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.asgClusterProvider !== undefined) {
      AsgClusterProvider.encode(message.asgClusterProvider, writer.uint32(10).fork()).ldelim();
    }
    if (message.mngClusterProvider !== undefined) {
      MngClusterProvider.encode(message.mngClusterProvider, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ClusterProvider {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseClusterProvider();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.asgClusterProvider = AsgClusterProvider.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.mngClusterProvider = MngClusterProvider.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ClusterProvider {
    return {
      asgClusterProvider: isSet(object.asgClusterProvider)
        ? AsgClusterProvider.fromJSON(object.asgClusterProvider)
        : undefined,
      mngClusterProvider: isSet(object.mngClusterProvider)
        ? MngClusterProvider.fromJSON(object.mngClusterProvider)
        : undefined,
    };
  },

  toJSON(message: ClusterProvider): unknown {
    const obj: any = {};
    if (message.asgClusterProvider !== undefined) {
      obj.asgClusterProvider = AsgClusterProvider.toJSON(message.asgClusterProvider);
    }
    if (message.mngClusterProvider !== undefined) {
      obj.mngClusterProvider = MngClusterProvider.toJSON(message.mngClusterProvider);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ClusterProvider>, I>>(base?: I): ClusterProvider {
    return ClusterProvider.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ClusterProvider>, I>>(object: I): ClusterProvider {
    const message = createBaseClusterProvider();
    message.asgClusterProvider = (object.asgClusterProvider !== undefined && object.asgClusterProvider !== null)
      ? AsgClusterProvider.fromPartial(object.asgClusterProvider)
      : undefined;
    message.mngClusterProvider = (object.mngClusterProvider !== undefined && object.mngClusterProvider !== null)
      ? MngClusterProvider.fromPartial(object.mngClusterProvider)
      : undefined;
    return message;
  },
};

function createBaseAsgClusterProvider(): AsgClusterProvider {
  return { name: undefined, version: "", id: "" };
}

export const AsgClusterProvider = {
  encode(message: AsgClusterProvider, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== undefined) {
      writer.uint32(10).string(message.name);
    }
    if (message.version !== "") {
      writer.uint32(18).string(message.version);
    }
    if (message.id !== "") {
      writer.uint32(26).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AsgClusterProvider {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAsgClusterProvider();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.version = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.id = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AsgClusterProvider {
    return {
      name: isSet(object.name) ? String(object.name) : undefined,
      version: isSet(object.version) ? String(object.version) : "",
      id: isSet(object.id) ? String(object.id) : "",
    };
  },

  toJSON(message: AsgClusterProvider): unknown {
    const obj: any = {};
    if (message.name !== undefined) {
      obj.name = message.name;
    }
    if (message.version !== "") {
      obj.version = message.version;
    }
    if (message.id !== "") {
      obj.id = message.id;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AsgClusterProvider>, I>>(base?: I): AsgClusterProvider {
    return AsgClusterProvider.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<AsgClusterProvider>, I>>(object: I): AsgClusterProvider {
    const message = createBaseAsgClusterProvider();
    message.name = object.name ?? undefined;
    message.version = object.version ?? "";
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseMngClusterProvider(): MngClusterProvider {
  return { name: undefined, version: "" };
}

export const MngClusterProvider = {
  encode(message: MngClusterProvider, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== undefined) {
      writer.uint32(10).string(message.name);
    }
    if (message.version !== "") {
      writer.uint32(18).string(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MngClusterProvider {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMngClusterProvider();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.version = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MngClusterProvider {
    return {
      name: isSet(object.name) ? String(object.name) : undefined,
      version: isSet(object.version) ? String(object.version) : "",
    };
  },

  toJSON(message: MngClusterProvider): unknown {
    const obj: any = {};
    if (message.name !== undefined) {
      obj.name = message.name;
    }
    if (message.version !== "") {
      obj.version = message.version;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MngClusterProvider>, I>>(base?: I): MngClusterProvider {
    return MngClusterProvider.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MngClusterProvider>, I>>(object: I): MngClusterProvider {
    const message = createBaseMngClusterProvider();
    message.name = object.name ?? undefined;
    message.version = object.version ?? "";
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
