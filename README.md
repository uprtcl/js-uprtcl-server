# Webserver Service Provider for [js-uprtcl](https://github.com/uprtcl/js-uprtcl)

**Prerequisites**

Install `serverless` globally.
`npm i -g serverless`

**Local Development**

- Run [dgraph](https://github.com/dgraph-io/dgraph) using

  ```
  sudo docker run --rm -it -p 8080:8080 -p 9080:9080 -p 8000:8000 -v ~/dgraph:/dgraph dgraph/standalone:v20.03.3
  ```

- Create a `.env` file in the root folder with the content:

  ```
  JWT_SECRET=123456
  PROTOCOL=http
  HOST=localhost:3100

  ```

- Then the server in debug mode.

  ```
  npm i
  npm run debug
  ```
