import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

const GARAGE_IMAGE = 'dxflrs/garage:v2.3.0';
const GARAGE_API_PORT = 3900;
const GARAGE_RPC_PORT = 3901;
const GARAGE_REGION = 'garage';
const GARAGE_DEFAULT_ACCESS_KEY = 'GKcc07e066098775f0bfd9a3f74a8b00fa';
const GARAGE_DEFAULT_SECRET_KEY = 'ca4915e4ecba9c92d21e2a93d6c61fbaf68af324a6158160bc061c93cfd9e560';
const GARAGE_DEFAULT_BUCKET = 'default-bucket';

export type StartedGarageTestContainer = {
  container: StartedTestContainer;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
};

export async function startGarageTestContainer(): Promise<StartedGarageTestContainer> {
  const container = await new GenericContainer(GARAGE_IMAGE)
    .withExposedPorts(GARAGE_API_PORT, GARAGE_RPC_PORT)
    .withCopyContentToContainer([
      {
        content: garageConfig(),
        target: '/etc/garage.toml',
      },
    ])
    .withCommand(['/garage', 'server', '--single-node', '--default-bucket'])
    .withWaitStrategy(Wait.forLogMessage(/S3 API server listening on/))
    .withLabels({ suite: 'shelter-backend-unit-tests' })
    .withReuse()
    .withEnvironment({
      GARAGE_DEFAULT_ACCESS_KEY: GARAGE_DEFAULT_ACCESS_KEY,
      GARAGE_DEFAULT_SECRET_KEY: GARAGE_DEFAULT_SECRET_KEY,
      GARAGE_DEFAULT_BUCKET: GARAGE_DEFAULT_BUCKET,
    })
    .start();

  return {
    container,
    endpoint: `http://${container.getHost()}:${container.getMappedPort(GARAGE_API_PORT)}`,
    accessKeyId: GARAGE_DEFAULT_ACCESS_KEY,
    secretAccessKey: GARAGE_DEFAULT_SECRET_KEY,
    bucket: GARAGE_DEFAULT_BUCKET,
    region: GARAGE_REGION,
  };
}

function garageConfig(): string {
  return `metadata_dir = "/tmp/meta"
data_dir = "/tmp/data"
db_engine = "sqlite"

replication_factor = 1

rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "e3101a2d755dac70e65b96430e6b99e91d7b19de070aab81d6b5fc6f6f99ddd6"

[s3_api]
s3_region = "${GARAGE_REGION}"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"

[s3_web]
bind_addr = "[::]:3902"
root_domain = ".web.garage.localhost"
index = "index.html"

[admin]
api_bind_addr = "[::]:3903"
admin_token = "UXGnygRoIK4My6p41mhDTAS8/0BEk55UJzEXt5xNREE="
metrics_token = "UXGnygRoIK4My6p41mhDTAS8/0BEk55UJzEXt5xNREE="
`;
}
