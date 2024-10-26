# Project Name Human

- [Development](#development)
  - [Requirements](#requirements)
  - [Configuration](#configuration)
    - [Environment](#environment)
    - [Git hooks (optional)](#git-hooks-optional)
  - [Setup](#setup)
    - [Other setups](#other-setups)
    - [Available scripts](#available-scripts)
  - [Good to know](#good-to-know)
    - [Notable inclusions and exclusions](#notable-changes-to-default-adonisjs-template)
    - [Third party services](#third-party-services)

Description of the project. What is it solving? Who are the users?

This section should include any business related explanation that helps understand the context of the project. It could be an excellent idea to include a dictionary of terms, a color legend or a user roles explanation.

- App: [staging](https://<project-name-param>-staging.herokuapp.com/) | [production](https://<project-name-param>-production.herokuapp.com/)
- Heroku: [staging](https://dashboard.heroku.com/apps/<project-name-param>-staging) | [production](https://dashboard.heroku.com/apps/<project-name-param>-production)
- Asana:
- URL to Abtion's own related git repositories (frontend / backend / admin area / microservices)
- Harvest:
- CI:
- Client name, and if possible, contact details.
- 1Password:
- Error Tracking:
- Activity Monitoring:
- Logging:
- Email Service:
- Client: IT person contact details

If the project is using some special external services (NemID, oAuth, Customer API, etc.) give a short description here.
Example: The app is using NemID to authenticate all its users.

## Development

### Requirements

- [Docker](https://www.docker.com/get-started/)
- [ASDF](https://asdf-vm.com/guide/getting-started.html) (plugins defined in [.tool-versions](./.tool-versions))

### Configuration

#### Environment

Env files are ONLY loaded for non-production envs.

Otherwise they follow [AdonisJS's environment variables docs](https://docs.adonisjs.com/guides/getting-started/environment-variables#all-other-dot-env-files).

### Setup

The recommended way to run the project is to use `docker compose` for databases and `asdf` for installing runtimes.\

For running the project locally:

1. In one terminal window:

   ```sh
   docker compose up
   ```

2. In another terminal window:

   ```sh
   asdf install # To install runtimes
   bin/setup # To install dependencies and initialize the database
   npm run dev # To run the webserver
   ```

3. The project can now be accessed at <http://localhost:3000>

#### Other setups

It is also possible to run everything locally, but it requires locally setting up the services specified in the [docker-compose.yml](docker-compose.yml).\
It will also require changes to the connection string env vars.

#### Available scripts

Contrary to other Abtion projects, not all files under `bin` are executable.\
Some are instead used by AdonisJS' `ace` tool:

```sh
bin/console.ts # AdonisJS commands
bin/server.ts # AdonisJS server
bin/test.ts # AdonisJS tests
```

Otherwise regular "shebang" type scripts are added:

```sh
bin/setup # For setting up the project
```

Custom commands for `ace` (similar to `rake` commands for rails) are located inside `commands` and include:

```sh
node ace db:create # Create dev and test dbs
node ace db:drop # Drop dev and test dbs
node ace db:migrate # Migrate dev (or test) db
node ace db:rollback # Rollback dev (or test) db
node ace make:migration # Create a db migration using kysely's migration language
```

There are also many other built-in commands that can be inspected by just running `node ace`, for instance:

```sh
node ace make:* # Lots of options, like `rails g`
node ace repl # Similar to `rails c`
node ace list:routes # Similar to `rails routes`
```

## Good to know

### Notable changes to default AdonisJS template

The project was initialized:

- As a web project
- With React (Inertia) front-end
- PostgresQL was selected as database.

Otherwise the following changes where made:

- Railsification
  - Env files made more like our rails template
  - Setup script added: `bin/setup`
  - Scripts for creating and dropping databases
  - `config/database.ts`: A single place for db config for multiple envs
- Database
  - Kysely used instead of lucid
    - Allows us to have types in react
- Tailwind added + setup for component library compatibility
- Development server running on 3000 because we are used to that
- Tests
  - Test server port changed to not conflict with development server
  - Automatically run pending migrations
  - Code coverage has been set up (Use `--coverage` flag when running tests)
- Authentication implemented
- Landing page and simple user management implemented

### Third party services

#### Name of the third party

- **Description:**
- **Auth:** Where can it be found. E.g. .env file
- **Documentation:**
- **Web interface:**
- **IT Contact person:**
