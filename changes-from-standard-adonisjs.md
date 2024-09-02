# Changes from "standard" adonisjs

- Env files made more like our rails template
- Setup script added: `bin/setup`
- Database
  - Kysely used instead of lucid
    - Allows us to have types in react
  - Scripts for creating and dropping databases
  - `config/database.ts`: A single place for db config for multiple envs (like rails)
- Render react views with inertia

# TODO:
- Don't load .env in production env (maybe delete it when building)
