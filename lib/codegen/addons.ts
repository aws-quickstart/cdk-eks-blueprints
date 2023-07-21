/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export interface AddAddonsRequest {
  addons: Addon[];
}

export interface Addon {
  ackAddOn?: AckAddOn | undefined;
  kubeProxyAddOn?: KubeProxyAddOn | undefined;
}

export interface AckAddOn {
  id?: string | undefined;
  serviceName: string;
}

export interface KubeProxyAddOn {
  version?: string | undefined;
}

function createBaseAddAddonsRequest(): AddAddonsRequest {
  return { addons: [] };
}

export const AddAddonsRequest = {
  encode(message: AddAddonsRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.addons) {
      Addon.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AddAddonsRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAddAddonsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.addons.push(Addon.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AddAddonsRequest {
    return { addons: Array.isArray(object?.addons) ? object.addons.map((e: any) => Addon.fromJSON(e)) : [] };
  },

  toJSON(message: AddAddonsRequest): unknown {
    const obj: any = {};
    if (message.addons?.length) {
      obj.addons = message.addons.map((e) => Addon.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AddAddonsRequest>, I>>(base?: I): AddAddonsRequest {
    return AddAddonsRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<AddAddonsRequest>, I>>(object: I): AddAddonsRequest {
    const message = createBaseAddAddonsRequest();
    message.addons = object.addons?.map((e) => Addon.fromPartial(e)) || [];
    return message;
  },
};

function createBaseAddon(): Addon {
  return { ackAddOn: undefined, kubeProxyAddOn: undefined };
}

export const Addon = {
  encode(message: Addon, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.ackAddOn !== undefined) {
      AckAddOn.encode(message.ackAddOn, writer.uint32(10).fork()).ldelim();
    }
    if (message.kubeProxyAddOn !== undefined) {
      KubeProxyAddOn.encode(message.kubeProxyAddOn, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Addon {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAddon();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.ackAddOn = AckAddOn.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.kubeProxyAddOn = KubeProxyAddOn.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Addon {
    return {
      ackAddOn: isSet(object.ackAddOn) ? AckAddOn.fromJSON(object.ackAddOn) : undefined,
      kubeProxyAddOn: isSet(object.kubeProxyAddOn) ? KubeProxyAddOn.fromJSON(object.kubeProxyAddOn) : undefined,
    };
  },

  toJSON(message: Addon): unknown {
    const obj: any = {};
    if (message.ackAddOn !== undefined) {
      obj.ackAddOn = AckAddOn.toJSON(message.ackAddOn);
    }
    if (message.kubeProxyAddOn !== undefined) {
      obj.kubeProxyAddOn = KubeProxyAddOn.toJSON(message.kubeProxyAddOn);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Addon>, I>>(base?: I): Addon {
    return Addon.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Addon>, I>>(object: I): Addon {
    const message = createBaseAddon();
    message.ackAddOn = (object.ackAddOn !== undefined && object.ackAddOn !== null)
      ? AckAddOn.fromPartial(object.ackAddOn)
      : undefined;
    message.kubeProxyAddOn = (object.kubeProxyAddOn !== undefined && object.kubeProxyAddOn !== null)
      ? KubeProxyAddOn.fromPartial(object.kubeProxyAddOn)
      : undefined;
    return message;
  },
};

function createBaseAckAddOn(): AckAddOn {
  return { id: undefined, serviceName: "" };
}

export const AckAddOn = {
  encode(message: AckAddOn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== undefined) {
      writer.uint32(10).string(message.id);
    }
    if (message.serviceName !== "") {
      writer.uint32(18).string(message.serviceName);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AckAddOn {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAckAddOn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.serviceName = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AckAddOn {
    return {
      id: isSet(object.id) ? String(object.id) : undefined,
      serviceName: isSet(object.serviceName) ? String(object.serviceName) : "",
    };
  },

  toJSON(message: AckAddOn): unknown {
    const obj: any = {};
    if (message.id !== undefined) {
      obj.id = message.id;
    }
    if (message.serviceName !== "") {
      obj.serviceName = message.serviceName;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AckAddOn>, I>>(base?: I): AckAddOn {
    return AckAddOn.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<AckAddOn>, I>>(object: I): AckAddOn {
    const message = createBaseAckAddOn();
    message.id = object.id ?? undefined;
    message.serviceName = object.serviceName ?? "";
    return message;
  },
};

function createBaseKubeProxyAddOn(): KubeProxyAddOn {
  return { version: undefined };
}

export const KubeProxyAddOn = {
  encode(message: KubeProxyAddOn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.version !== undefined) {
      writer.uint32(10).string(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): KubeProxyAddOn {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseKubeProxyAddOn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
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

  fromJSON(object: any): KubeProxyAddOn {
    return { version: isSet(object.version) ? String(object.version) : undefined };
  },

  toJSON(message: KubeProxyAddOn): unknown {
    const obj: any = {};
    if (message.version !== undefined) {
      obj.version = message.version;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<KubeProxyAddOn>, I>>(base?: I): KubeProxyAddOn {
    return KubeProxyAddOn.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<KubeProxyAddOn>, I>>(object: I): KubeProxyAddOn {
    const message = createBaseKubeProxyAddOn();
    message.version = object.version ?? undefined;
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
