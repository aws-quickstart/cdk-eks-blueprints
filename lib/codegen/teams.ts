/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export interface AddTeamsRequest {
  clusterName: string;
  teams: Team[];
}

export interface Team {
  genericTeam?: GenericTeam | undefined;
  platformTeam?: PlatformTeam | undefined;
  applicationTeam?: ApplicationTeam | undefined;
}

export interface GenericTeam {
  name: string;
}

export interface AddPlatformTeamRequest {
  clusterName: string;
  props: TeamProps | undefined;
}

export interface PlatformTeam {
  name: string;
}

export interface ApplicationTeam {
  name: string;
}

export interface AddApplicationTeamRequest {
  clusterName: string;
  props: TeamProps | undefined;
}

export interface TeamProps {
  name: string;
}

function createBaseAddTeamsRequest(): AddTeamsRequest {
  return { clusterName: "", teams: [] };
}

export const AddTeamsRequest = {
  encode(message: AddTeamsRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.clusterName !== "") {
      writer.uint32(10).string(message.clusterName);
    }
    for (const v of message.teams) {
      Team.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AddTeamsRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAddTeamsRequest();
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

          message.teams.push(Team.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AddTeamsRequest {
    return {
      clusterName: isSet(object.clusterName) ? String(object.clusterName) : "",
      teams: Array.isArray(object?.teams) ? object.teams.map((e: any) => Team.fromJSON(e)) : [],
    };
  },

  toJSON(message: AddTeamsRequest): unknown {
    const obj: any = {};
    if (message.clusterName !== "") {
      obj.clusterName = message.clusterName;
    }
    if (message.teams?.length) {
      obj.teams = message.teams.map((e) => Team.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AddTeamsRequest>, I>>(base?: I): AddTeamsRequest {
    return AddTeamsRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<AddTeamsRequest>, I>>(object: I): AddTeamsRequest {
    const message = createBaseAddTeamsRequest();
    message.clusterName = object.clusterName ?? "";
    message.teams = object.teams?.map((e) => Team.fromPartial(e)) || [];
    return message;
  },
};

function createBaseTeam(): Team {
  return { genericTeam: undefined, platformTeam: undefined, applicationTeam: undefined };
}

export const Team = {
  encode(message: Team, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.genericTeam !== undefined) {
      GenericTeam.encode(message.genericTeam, writer.uint32(10).fork()).ldelim();
    }
    if (message.platformTeam !== undefined) {
      PlatformTeam.encode(message.platformTeam, writer.uint32(18).fork()).ldelim();
    }
    if (message.applicationTeam !== undefined) {
      ApplicationTeam.encode(message.applicationTeam, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Team {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTeam();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.genericTeam = GenericTeam.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.platformTeam = PlatformTeam.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.applicationTeam = ApplicationTeam.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Team {
    return {
      genericTeam: isSet(object.genericTeam) ? GenericTeam.fromJSON(object.genericTeam) : undefined,
      platformTeam: isSet(object.platformTeam) ? PlatformTeam.fromJSON(object.platformTeam) : undefined,
      applicationTeam: isSet(object.applicationTeam) ? ApplicationTeam.fromJSON(object.applicationTeam) : undefined,
    };
  },

  toJSON(message: Team): unknown {
    const obj: any = {};
    if (message.genericTeam !== undefined) {
      obj.genericTeam = GenericTeam.toJSON(message.genericTeam);
    }
    if (message.platformTeam !== undefined) {
      obj.platformTeam = PlatformTeam.toJSON(message.platformTeam);
    }
    if (message.applicationTeam !== undefined) {
      obj.applicationTeam = ApplicationTeam.toJSON(message.applicationTeam);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Team>, I>>(base?: I): Team {
    return Team.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Team>, I>>(object: I): Team {
    const message = createBaseTeam();
    message.genericTeam = (object.genericTeam !== undefined && object.genericTeam !== null)
      ? GenericTeam.fromPartial(object.genericTeam)
      : undefined;
    message.platformTeam = (object.platformTeam !== undefined && object.platformTeam !== null)
      ? PlatformTeam.fromPartial(object.platformTeam)
      : undefined;
    message.applicationTeam = (object.applicationTeam !== undefined && object.applicationTeam !== null)
      ? ApplicationTeam.fromPartial(object.applicationTeam)
      : undefined;
    return message;
  },
};

function createBaseGenericTeam(): GenericTeam {
  return { name: "" };
}

export const GenericTeam = {
  encode(message: GenericTeam, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GenericTeam {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenericTeam();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GenericTeam {
    return { name: isSet(object.name) ? String(object.name) : "" };
  },

  toJSON(message: GenericTeam): unknown {
    const obj: any = {};
    if (message.name !== "") {
      obj.name = message.name;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GenericTeam>, I>>(base?: I): GenericTeam {
    return GenericTeam.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GenericTeam>, I>>(object: I): GenericTeam {
    const message = createBaseGenericTeam();
    message.name = object.name ?? "";
    return message;
  },
};

function createBaseAddPlatformTeamRequest(): AddPlatformTeamRequest {
  return { clusterName: "", props: undefined };
}

export const AddPlatformTeamRequest = {
  encode(message: AddPlatformTeamRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.clusterName !== "") {
      writer.uint32(10).string(message.clusterName);
    }
    if (message.props !== undefined) {
      TeamProps.encode(message.props, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AddPlatformTeamRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAddPlatformTeamRequest();
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

          message.props = TeamProps.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AddPlatformTeamRequest {
    return {
      clusterName: isSet(object.clusterName) ? String(object.clusterName) : "",
      props: isSet(object.props) ? TeamProps.fromJSON(object.props) : undefined,
    };
  },

  toJSON(message: AddPlatformTeamRequest): unknown {
    const obj: any = {};
    if (message.clusterName !== "") {
      obj.clusterName = message.clusterName;
    }
    if (message.props !== undefined) {
      obj.props = TeamProps.toJSON(message.props);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AddPlatformTeamRequest>, I>>(base?: I): AddPlatformTeamRequest {
    return AddPlatformTeamRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<AddPlatformTeamRequest>, I>>(object: I): AddPlatformTeamRequest {
    const message = createBaseAddPlatformTeamRequest();
    message.clusterName = object.clusterName ?? "";
    message.props = (object.props !== undefined && object.props !== null)
      ? TeamProps.fromPartial(object.props)
      : undefined;
    return message;
  },
};

function createBasePlatformTeam(): PlatformTeam {
  return { name: "" };
}

export const PlatformTeam = {
  encode(message: PlatformTeam, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PlatformTeam {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePlatformTeam();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PlatformTeam {
    return { name: isSet(object.name) ? String(object.name) : "" };
  },

  toJSON(message: PlatformTeam): unknown {
    const obj: any = {};
    if (message.name !== "") {
      obj.name = message.name;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PlatformTeam>, I>>(base?: I): PlatformTeam {
    return PlatformTeam.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PlatformTeam>, I>>(object: I): PlatformTeam {
    const message = createBasePlatformTeam();
    message.name = object.name ?? "";
    return message;
  },
};

function createBaseApplicationTeam(): ApplicationTeam {
  return { name: "" };
}

export const ApplicationTeam = {
  encode(message: ApplicationTeam, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ApplicationTeam {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseApplicationTeam();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ApplicationTeam {
    return { name: isSet(object.name) ? String(object.name) : "" };
  },

  toJSON(message: ApplicationTeam): unknown {
    const obj: any = {};
    if (message.name !== "") {
      obj.name = message.name;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ApplicationTeam>, I>>(base?: I): ApplicationTeam {
    return ApplicationTeam.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ApplicationTeam>, I>>(object: I): ApplicationTeam {
    const message = createBaseApplicationTeam();
    message.name = object.name ?? "";
    return message;
  },
};

function createBaseAddApplicationTeamRequest(): AddApplicationTeamRequest {
  return { clusterName: "", props: undefined };
}

export const AddApplicationTeamRequest = {
  encode(message: AddApplicationTeamRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.clusterName !== "") {
      writer.uint32(10).string(message.clusterName);
    }
    if (message.props !== undefined) {
      TeamProps.encode(message.props, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AddApplicationTeamRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAddApplicationTeamRequest();
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

          message.props = TeamProps.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AddApplicationTeamRequest {
    return {
      clusterName: isSet(object.clusterName) ? String(object.clusterName) : "",
      props: isSet(object.props) ? TeamProps.fromJSON(object.props) : undefined,
    };
  },

  toJSON(message: AddApplicationTeamRequest): unknown {
    const obj: any = {};
    if (message.clusterName !== "") {
      obj.clusterName = message.clusterName;
    }
    if (message.props !== undefined) {
      obj.props = TeamProps.toJSON(message.props);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AddApplicationTeamRequest>, I>>(base?: I): AddApplicationTeamRequest {
    return AddApplicationTeamRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<AddApplicationTeamRequest>, I>>(object: I): AddApplicationTeamRequest {
    const message = createBaseAddApplicationTeamRequest();
    message.clusterName = object.clusterName ?? "";
    message.props = (object.props !== undefined && object.props !== null)
      ? TeamProps.fromPartial(object.props)
      : undefined;
    return message;
  },
};

function createBaseTeamProps(): TeamProps {
  return { name: "" };
}

export const TeamProps = {
  encode(message: TeamProps, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TeamProps {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTeamProps();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TeamProps {
    return { name: isSet(object.name) ? String(object.name) : "" };
  },

  toJSON(message: TeamProps): unknown {
    const obj: any = {};
    if (message.name !== "") {
      obj.name = message.name;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TeamProps>, I>>(base?: I): TeamProps {
    return TeamProps.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TeamProps>, I>>(object: I): TeamProps {
    const message = createBaseTeamProps();
    message.name = object.name ?? "";
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
