export interface Environment {
  name: string;
  domain: string;
  vpc: {
    maxAzs: number;
    natGateways: number;
  };
  container: {
    cpu: number;
    memoryLimitMiB: number;
    desiredCount: number;
  };
  monitoring: {
    logRetentionDays: number;
    alarmEvaluationPeriods: number;
    alarmThresholdPercent: number;
  };
  scaling: {
    minCapacity: number;
    maxCapacity: number;
    targetCpuUtilization: number;
    scaleInCooldown: number;
    scaleOutCooldown: number;
  };
  cache: {
    enabled: boolean;
    ttlSeconds: number;
  };
  rateLimit: {
    enabled: boolean;
    requestsPerSecond: number;
  };
}
