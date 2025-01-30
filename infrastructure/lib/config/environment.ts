import { Environment } from "../types/environment";

export const environments: { [key: string]: Environment } = {
  development: {
    name: "development",
    domain: "dev.stardex.bjornmelin.io",
    vpc: {
      maxAzs: 2,
      natGateways: 0,
    },
    container: {
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
    },
    monitoring: {
      logRetentionDays: 7,
      alarmEvaluationPeriods: 2,
      alarmThresholdPercent: 70,
    },
    scaling: {
      minCapacity: 1,
      maxCapacity: 3,
      targetCpuUtilization: 70,
      scaleInCooldown: 60,
      scaleOutCooldown: 60,
    },
    cache: {
      enabled: true,
      ttlSeconds: 300,
    },
    rateLimit: {
      enabled: true,
      requestsPerSecond: 100,
    },
  },
  production: {
    name: "production",
    domain: "stardex.bjornmelin.io",
    vpc: {
      maxAzs: 3,
      natGateways: 1,
    },
    container: {
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
    },
    monitoring: {
      logRetentionDays: 30,
      alarmEvaluationPeriods: 3,
      alarmThresholdPercent: 80,
    },
    scaling: {
      minCapacity: 2,
      maxCapacity: 10,
      targetCpuUtilization: 75,
      scaleInCooldown: 300,
      scaleOutCooldown: 60,
    },
    cache: {
      enabled: true,
      ttlSeconds: 3600,
    },
    rateLimit: {
      enabled: true,
      requestsPerSecond: 500,
    },
  },
};

export const getEnvironment = (stage: string): Environment => {
  const env = environments[stage];
  if (!env) {
    throw new Error(`Environment ${stage} not found`);
  }
  return env;
};
