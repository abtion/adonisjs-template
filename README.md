# Abtion AdonisJS Template

- [Abtion AdonisJS Template](#abtion-adonisjs-template)
  - [What is this?](#what-is-this)
    - [What are the benefits of using this?](#what-are-the-benefits-of-using-this)
    - [Finding the right compromise](#finding-the-right-compromise)
  - [Key features](#key-features)
  - [Getting Started](#getting-started)
    - [Start a new project](#start-a-new-project)
      - [Set up branch protection rules](#set-up-branch-protection-rules)
    - [Replace license](#replace-license)
    - [Configure the project](#configure-the-project)
    - [Setup colors](#setup-colors)
    - [Configure CD](#configure-cd)
    - [Setup mailing](#setup-mailing)
    - [Setup basic auth](#setup-basic-auth)
  - [Contributing](#contributing)
  - [License](#license)
  - [About Abtion](#about-abtion)

## What is this?

The Abtion AdonisJS template is a project template maintained by [Abtion](https://abtion.com/) and used to kick start
AdonisJS applications.

### What are the benefits of using this?

- Much less time spent on "first-time setup":
  - Projects starting from this template include all the libraries we typically use at Abtion on the latest version.
  - Basic functionality is there from the start; we can have the app live from the moment we start, start sending emails, or log in with a user to the system.
- Lots of decisions are already made:
  - We've made these same decisions many times - now we know which decisions are the right ones.
- Fully functional test setup.
  - Tests are not an afterthought. They are an integrated part of the development flow.
  - Reliable software from day one.
- Easy for developers to switch between similar projects.
  - Easy to scale projects up and down. Developers know what to expect when they join the project. They've seen similar things before.
  - Less reliance on specific people - the whole team can contribute even when a team member is not present.

### Finding the right compromise

Everything in the template has been carefully considered in regards to:

- We want to be open to multiple unknown futures, with one single template.
- But we don't want the feature creep to creep up on us too much.

## Key features

- Uses [GitHub Actions](https://docs.github.com/en/free-pro-team@latest/actions)
- Uses [Jest](https://github.com/facebook/jest)
- Uses [Kysely](https://github.com/kysely-org/kysely)

## Getting Started

### Start a new project

To start up, simply create a new repository on GitHub using this repository as a template.
(You lose the template's history, adding everything as one initial commit)

Alternatively, import the template into a new repository by going to <https://github.com/new/import> and specifying <https://github.com/abtion/adonisjs-template.git> (You retain all template history)

#### Set up branch protection rules

- Require status checks before merging.
- Require branches to be up to date.
- Require signed commits.

### Replace license

Replace the contents of `LICENSE.md` with the following:

```txt
Copyright (C) Abtion - All Rights Reserved
Unauthorized copying of this project, via any medium is strictly prohibited.
Proprietary and confidential.
```

### Configure the project

1. Use script for replacing `project-name-param` etc. in all files:
   - `bin/replace_project_names.ts` (uses the folder name)
   - Or `bin/replace-project-names <param-case-name>`
2. `mv README.example.md README.md`
3. Replace sonarqube.properties key

### Setup colors

`colors.json` must be updated so match the client's company colors/design guide.

If there's a designer on the project, get that person to fill in all the colors and nuances.

If there's no designer present, replace the colors with company colors where it makes sense. Use a tool like the following for creating nuances:
<https://tailwind.simeongriggs.dev/>

All the predefined colors are required for the built-in components to work:

- Contrast colors are picked from the "light" and "dark" colours.
- Contextual colors (primary, secondary, etc.) are used for component variants.

### Configure CD

1. Create staging Scalingo app based on the template.
   1. Visit: <https://dashboard.scalingo.com/create/app?source=https%3A%2F%2Fgithub.com%2Fabtion%2Fadonisjs-template>
   2. Fill in the name with `<PROJECT-NAME>-staging`.
   3. Select europe as region.
   4. Fill in required env vars (read the field descriptions for guidance).
   5. Press the deploy button.
   6. Take a 5 minute break while Scalingo sets up app and pipeline.
2. Create the production app the same way as the staging app, only this time:
   - Name the app `<PROJECT-NAME>-production`.
3. Connect deployment to the project's github repo.

### Setup mailing

Setting up email has historically proven to be something we cannot do in the beginning of projects. A project needs a domain, and we need access to the DNS settings of that domain. Furthermore, there are clients running their own SMTP servers elsewhere.

For those reasons use <https://mailtrap.io>. Mailtrap catches any sent emails and allows us to potentially debug them. Most importantly it lets the app run without a hitch until the requirements for setting up real email are met.

When a project eventually gets a domain, and we have access to the domain's DNS settings, our goto solution is to set up [brevo](https://www.brevo.com/) for the production environment:

1. Register and add to 1Password new brevo account
   1. Register: <https://app.brevo.com/account/register>
   2. Email: Client google group account
   3. Password: Generate in 1Password
2. You must validate a phone number to start sending mails.
   1. Use your company's shared phone number for validation and retrieve the code from the relevant internal channel.
3. Generate brevo keys
   1. Go to SMTP & API under user settings
   2. Click on SMTP Tab
   3. Create a new SMTP KEY.
   4. Copy smtp key value to `SMTP_PASSWORD` on Scalingo
   5. Copy login to `SMTP_USERNAME` on Scalingo
4. Setup DNS:
   1. Go to: <https://account.brevo.com/senders>
   2. Open "Domains"
   3. Add a new domain
   4. Fill in domain name and check the option to digitally sign emails, then continue
   5. Add each of the shown DNS records to the client's DNS setup.
      The DNS provider differs from client to client depending on whether we bought the domain or they did it themselves.
      If we don't have access, we provide the settings to the client so they can set it up.
   6. It will take an hour or so for new records to propagate, be patient.
   7. Back on the brevo page, validate each setting.
   8. When all settings are validated, the setup is complete.

### Setup basic auth

For added security we want to add basic auth to our review/staging environments.

1. Go to the Review/Staging app in the Scalingo dashboard.
2. Add environment variables for:
3. `HTTP_AUTH_USERNAME`
4. `HTTP_AUTH_PASSWORD`

## Contributing

The Abtion AdonisJS Template is maintained by [_Abtioneers_](#about-abtion), but open for anyone to suggest improvements and bugfixes.

One abtioneer is currently responsible for the project at Abtion, with support from other employees.

Please see [CONTRIBUTING.md](https://github.com/abtion/adonisjs-template/blob/main/CONTRIBUTING.md).

## License

[Unlicense](https://unlicense.org/)

## About Abtion

[![Abtion](abtion.png 'Abtion')](https://abtion.com/)

[Abtion](https://abtion.com/) is a technology company building software and
services that make life better, easier and more fun. Zeros and ones are the
backbone of our work, and together with a diverse mix of designers, developers
and strategists, we create websites, mobile- and web applications with a purpose.
