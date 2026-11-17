export interface IASFAdapter<TInput, TOutput> {
  name: string;
  version: string;
  license: string;
  execute(input: TInput): Promise<ASFAdapterResult<TOutput>>;
  validate(input: TInput): Promise<boolean>;
  isAvailable(): Promise<boolean>;
}

export interface ASFAdapterResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    duration: number;
    toolVersion: string;
    timestamp: string;
  };
}

export type AdapterStatus = 'available' | 'unavailable' | 'error' | 'initializing';