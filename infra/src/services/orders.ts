import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { cluster } from "../cluster";
import { ordersDockerImage } from "../images/orders";
import { amqpListener, rabbitMQAdminHttpListener } from "./rabbitmq";
import { appLoadBalancer } from "../load-balancer";

const ordersTargetGroup = appLoadBalancer.createTargetGroup("orders-target", {
  port: 3334,
  protocol: "HTTP",
  healthCheck: {
    path: "/health",
    protocol: "HTTP",
  },
});

export const ordersHttpListener = appLoadBalancer.createListener(
  "orders-listener",
  {
    port: 3334,
    protocol: "HTTP",
    targetGroup: ordersTargetGroup,
  }
);

export const ordersService = new awsx.classic.ecs.FargateService(
  "fargate-orders",
  {
    cluster,
    desiredCount: 1,
    waitForSteadyState: false,
    taskDefinitionArgs: {
      container: {
        image: ordersDockerImage.ref,
        cpu: 256,
        memory: 512,
        portMappings: [ordersHttpListener],
        environment: [
          {
            name: "BROKER_URL",
            value: pulumi.interpolate`amqp://admin:admin@${amqpListener.endpoint.hostname}:${amqpListener.endpoint.port}`,
          },
          {
            name: "DATABASE_URL",
            value:
              "postgresql://postgres:XBaDnJx6X0YV9Gi10Dgr@database-test.cw54hvojpa8e.us-west-2.rds.amazonaws.com:5432/orders?sslmode=no-verify",
          },
          {
            name: "OTEL_TRACES_EXPORTER",
            value: "otlp",
          },
          {
            name: "OTEL_EXPORTER_OTLP_ENDPOINT",
            value: "https://otlp-gateway-prod-sa-east-1.grafana.net/otlp",
          },
          {
            name: "OTEL_EXPORTER_OTLP_HEADERS",
            value:
              "Authorization=Basic MTI4MjE4NjpnbGNfZXlKdklqb2lNVFExTWpJMk1pSXNJbTRpT2lKemRHRmpheTF4TWpneU1UZzJMVzkwWld3dGIyNWliMkZ5WkdsdVp5MXdaWEp6YjI1aGJDSXNJbXNpT2lJMGNUZzVhekpTU2tOVU1UWkRiakpxUWxGR1V6RTNVakVpTENKdElqcDdJbklpT2lKd2NtOWtMWE5oTFdWaGMzUXRNU0o5ZlE9PQ==",
          },
          {
            name: "OTEL_SERVICE_NAME",
            value: "orders",
          },
          {
            name: "OTEL_RESOURCE_ATTRIBUTES",
            value:
              "service.name=microservices,service.namespace=microservices-group,deployment.environment=production",
          },
          {
            name: "OTEL_NODE_RESOURCE_DETECTORS",
            value: "env,host,os",
          },
          {
            name: "OTEL_NODE_ENABLED_INSTRUMENTATIONS",
            value: "http,fastify,pg,amqplib",
          },
        ],
      },
    },
  }
);
