/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "mssql" {
  export interface ConnectionPoolConfig {
    server: string;
    database: string;
    user: string;
    password: string;
    port?: number;
    options?: {
      encrypt?: boolean;
      trustServerCertificate?: boolean;
    };
    pool?: {
      max?: number;
      min?: number;
      idleTimeoutMillis?: number;
    };
  }

  export interface IResult<T = any> {
    recordsets: T[][];
    recordset: T[];
    rowsAffected: number[];
    output: Record<string, any>;
  }

  export interface Request {
    input(name: string, type: ISqlType, value: any): Request;
    query<T = any>(command: string): Promise<IResult<T>>;
  }

  export interface ISqlType {
    type: any;
  }

  export class ConnectionPool {
    connected: boolean;
    constructor(config: ConnectionPoolConfig | string);
    connect(): Promise<ConnectionPool>;
    close(): Promise<void>;
    request(): Request;
  }

  export const Int: ISqlType;
  export const NVarChar: ISqlType;
  export const VarChar: ISqlType;
}
