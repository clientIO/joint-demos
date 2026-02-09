# JointJS+: Searchable Sitemap (JavaScript)

Thanks to SVG you can find the text in the JointJS+ diagram elements and navigate to them using the browser search. However, there are cases where you want to use a custom search, for example if you only want to search by data stored in models or if the text you are looking for is part of a collapsed branch. In this case, custom search is useful. See below for an example of how to implement such a search, which we demonstrate on our own sitemap generated from an XML file. Enjoy!

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

### Private npm registry

By default, this application uses JointJS+ from our private npm registry. This example assumes that you have already set up your npm to access JointJS+ package and put your authentication token in the `JOINTJS_NPM_TOKEN` environment variable.

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

### Install dependencies

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```
