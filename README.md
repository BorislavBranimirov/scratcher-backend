# Scratcher

This is the backend for a Twitter clone built with the PERN stack (PostgreSQL, Express, React, Node.js).

The frontend repo can be found here: [Frontend Repo](https://github.com/BorislavBranimirov/scratcher-frontend)

## Getting Started

Run the project by following these instructions:

- Install all dependencies from the root folder with `npm install`
- Create a `.env` file in the root folder (or copy and rename the .env.example file) and fill it with the appropriate variables

  - CLOUDINARY_CLOUD_NAME - Your cloud name on Cloudinary
  - CLOUDINARY_API_KEY - The API key from your Cloudinary account
  - CLOUDINARY_API_SECRET - The API secret from your Cloudinary account
  - PORT - Port to run the server on. If not specified, defaults to `8000`.
  - NODE_ENV - Specifies the server's environment, any of `development`, `test` or `production`. If not specified, defaults to `development`.
  - CORS_ORIGIN_URL - Origin URL that the server should allow requests from. If not specified, defaults to `http://localhost:3000`.
  - ACCESS_TOKEN_SECRET - The secret that will be used to generate access tokens for authentication
  - ACCESS_TOKEN_EXPIRES_AFTER - Miliseconds until access token expires or another time span notation from [vercel/ms](https://github.com/vercel/ms), such as 15m or 1d
  - REFRESH_TOKEN_SECRET - The secret that will be used to generate refresh tokens for authentication
  - REFRESH_TOKEN_EXPIRES_AFTER - Miliseconds until the refresh token expires
  - To connect to a PostgreSQL database in development:
    - With a URL:
      - PG_URL - The PostgreSQL URL to connect to
    - Or with connection parameters:
      - PG_USER - The database user on whose behalf the connection is being made
      - PG_HOST - The host name of the server
      - PG_DB - The database name
      - PG_PASSWORD - The database user's password
      - PG_PORT - The port number the server is listening on
  - To connect to a PostgreSQL database for testing:
    - PG_TEST_URL - The PostgreSQL URL to connect to
  - To connect to a PostgreSQL database in production:
    - DATABASE_URL - The PostgreSQL URL to connect to

- Run the suitable npm script (migrations should be run before starting the server)

```sh
# Run the server on port 8000 (by default)
npm start

# Run the server on port 8000 (by default) with live reloading (requires nodemon to be globally installed)
npm run server

# Run all jest tests
npm test

# The following commands are all related to the database. They are applied to the development database by default.
# Specify environment when calling the commands to target test or production environments.
# For example, to seed the PG_TEST_URL database run "npm run seed -- --env test"
# Or to directly use a knex command, "npx knex seed:run --env test"

# Update the database structure according to the files from /db/migrations
# The database should exist before running the command
npm run migrate

# Rollback the last batch of database migrations
npm run rollback

# Populate the database with the seed files from /db/seeds
# The files include user information that you can use to login
npm run seed

# Combination of rollback + migrate + seed
# Essentially deletes the current data from the database and resets it to an intial state from the seed files
npm run reseed
```

## Author

Borislav Branimirov

## License

This project is licensed under the MIT License
