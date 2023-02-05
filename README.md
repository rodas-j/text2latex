
# Turborepo
A NextJS web application that uses OpenAI's GPT-3 model to transcribe any type of input into LaTeX output. The AI-powered text-to-LaTeX transcription tool is designed to transform unstructured data into well-formatted LaTeX output, making it easier for users to create academic or technical documents.

## Prerequisites
Before you begin, make sure you have the following tools installed on your computer:

Node.js
Turbo
NPM
NextJS
OpenAI API Key
Installation
To install the dependencies, follow these steps:

## Clone the repository:
```bash
git clone https://github.com/rodas-j/turborepo.git
```

Install the dependencies:
```bash
npm install
```
Usage
To start the development server, run the following command:

```bash
npm run dev --filter web
```
The web application will be available at http://localhost:3000 in your web browser.

## Configuration
The application uses OpenAI's GPT-3 model for text-to-LaTeX transcription. To use the model, you will need an OpenAI API key. You can obtain an API key by signing up for an OpenAI account here.

Once you have obtained an API key, create a .env file in the root of the project and add the following line:


```.env
OPENAI_API_KEY=<your_api_key>
```
## Contributing
We welcome contributions to the project. If you would like to contribute, please follow these steps:

Fork the repository
Create a new branch for your feature or bug fix
Commit your changes
Open a pull request against the develop branch
## License
This project is licensed under the MIT License.


### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `ui`: a stub React component library shared by both `web` and `docs` applications
- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
pnpm run build
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo
pnpm run dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```
cd my-turborepo
pnpm dlx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your turborepo:

```
pnpm dlx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
