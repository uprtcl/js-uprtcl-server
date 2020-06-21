# Webserver Service Provider for [js-uprtcl](https://github.com/uprtcl/js-uprtcl)

**Prerequisites**

Install `serverless` globally.
`npm i -g serverless`

**Local Development**

- Install [dgraph](https://github.com/dgraph-io/dgraph) using using the `/install-dgraph.sh` script.

- Create a `.env` file in the root folder with the content:

  ```
  JWT_SECRET=123456
  PROTOCOL=http
  HOST=localhost:3100

  ```

- Then run dgraph and the server.

  ```
  npm i
  ./run-dgraph.sh
  npm run dev
  ```
