# JointJS: Ranked Layout (TypeScript)

Elements are assigned to ranks given in advance. The layout keeps every element in the column of its rank and orders the elements within each rank so that linked elements line up and links cross as little as possible. Links may jump over ranks. A seeded generator creates random graphs of any size.

<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/ranked-layout/ts" target="_blank">
  <img
    alt="Open in StackBlitz"
    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
  />
</a>

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download ranked-layout/ts
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

Install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```
