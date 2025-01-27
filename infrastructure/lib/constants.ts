export const CONFIG = {
  prod: {
    domainName: "stardex.bjornmelin.io",
    rootDomainName: "bjornmelin.io",
    environment: "prod" as const,
  },
  tags: {
    Project: "Stardex",
    ManagedBy: "CDK",
    Owner: "Bjorn Melin",
    Repository: "stardex",
  },
};

export const getStackName = (stackType: string, env: string) =>
  `${env}-stardex-${stackType}`;
