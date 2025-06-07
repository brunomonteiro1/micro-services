import * as awsx from "@pulumi/awsx";
import { appLoadBalancer, netWorkLoadBalancer } from "../load-balancer";
import { cluster } from "../cluster";

const rabbitMQAdminTargetGroup = appLoadBalancer.createTargetGroup(
  "rabbitmq-admin-target",
  {
    port: 15672,
    protocol: "HTTP",
    healthCheck: {
      path: "/",
      protocol: "HTTP",
    },
  }
);

export const rabbitMQAdminHttpListener = appLoadBalancer.createListener(
  "rabbit-admin-listener",
  {
    port: 15672,
    protocol: "HTTP",
    targetGroup: rabbitMQAdminTargetGroup,
  }
);

const amqpTargetGroup = netWorkLoadBalancer.createTargetGroup("amqp-target", {
  protocol: "TCP",
  port: 5672,
  targetType: "ip",
  healthCheck: {
    protocol: "TCP",
    port: "5672",
  },
});

export const amqpListener = netWorkLoadBalancer.createListener(
  "amqp-listener",
  {
    protocol: "TCP",
    port: 5672,
    targetGroup: amqpTargetGroup,
  }
);

export const rabbitMQService = new awsx.classic.ecs.FargateService(
  "fargate-rabbitmq",
  {
    cluster,
    desiredCount: 1,
    waitForSteadyState: false,
    taskDefinitionArgs: {
      container: {
        image: "rabbitmq:3-management",
        cpu: 256,
        memory: 512,
        portMappings: [rabbitMQAdminHttpListener, amqpListener],
        environment: [
          { name: "RABBITMQ_DEFAULT_USER", value: "admin" },
          { name: "RABBITMQ_DEFAULT_PASS", value: "admin" },
        ],
      },
    },
  }
);
