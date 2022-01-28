### Requirements
- Docker
- Docker compose

```shell
git clone ...
mv .env.example .env
```
### environment variables instructions
- `GOOGLE_MAPS_API_KEY` for Google Maps: https://console.cloud.google.com/google/maps-apis/new
- - You will need to turn on the driving directions API and geocoding API
- - Create [API Key credentials](https://console.cloud.google.com/google/maps-apis/credentials)
- `LICENSE_KEY` get a key from [here](https://my.retool.com/ssop_users/sign_up)

### Run the docker containers
`docker-compose up -d`

- Retool is running on `http://localhost:3000`
- Graphql is running on `http://localhost/v1/graphql`
- - use your environment variable as an auth header `x-hasura-admin-secret: <Hasura Admin Key;`
- Graphql >> REST is running on `http://localhost/api/rest`
- - use your environment variable as an auth header `x-hasura-admin-secret: <Hasura Admin Key>;`
- - See the configurations [here](./node_app/hasura/metadata/rest_endpoints.yaml)


## Using Retool
- Retool is running on `http://localhost:3000`
- Click the Sign Up link at the top and fill in user ino
- Create a postgres resource
- - Name it `Deliveries`
- - host: postgres, port: 5432, user: (from your env vars), password: (from your env vars), database: delivery
- Start building an app off postgres if you wish!
- Navigate to `/resources` by clicking on Retool logo then Resources
- - IMPORTANT! Make sure you know the resources as called out here. When importing the apps, Retool will try to match by name.
- Create new GraphQL Resource
- - Name it `Deliveries (Update)`
- - Base URL: `http://host.docker.internal/v1/graphql`
- - Headers: `x-hasura-admin-secret: %RETOOL_EXPOSED_ADMIN_SECRET%;`
- Create new REST Resource
- - Name it `Deliveries (Write)`
- - Base URL: `http://host.docker.internal/api/rest`
- - Headers: `x-hasura-admin-secret: %RETOOL_EXPOSED_ADMIN_SECRET%;`
- Import the Retool applications
- - Navigate to home (`/`) and click the Create new button in the top right
- - Choose import an app and repeat for all in `./retool` directory in this repo