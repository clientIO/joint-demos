# JointJS+: Tabs (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

This git repository is intended for instructional purposes. It is the source code that accompanies a Rappid blog post "Integration with React" which can be found [here](https://resources.jointjs.com/tutorial/react-ts).

### Prerequisites

To run the following code, you will need a [Rappid license](https://www.jointjs.com/license) that comes with the Rappid installable package file `rappid.tgz`.

### Dependencies

Make sure you have the following dependencies installed on your system:

- [Node.js](https://nodejs.org/en/)
- git

#### Setup

Clone this repository.

```
git clone git@github.com:clientIO/rappid-tutorial-react.git
```

Change into the `rappid-tutorial-react` directory.

```
cd rappid-tutorial-react
```

For this tutorial, you need to place your own `rappid.tgz` file in the root directory.

When that is completed, you can install the dependencies.

```
npm install
```

Your demo is now ready to start.

```
npm start
```

You should be able to view the demo at `http://localhost:3000`.

#### Note
We have decided to keep the React import in our code for consistency reasons.

*Because the new JSX transform will automatically import the necessary react/jsx-runtime functions, React will no longer need to be in scope when you use JSX. This might lead to unused React imports in your code. It doesn’t hurt to keep them.*
[Unused React imports](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html#removing-unused-react-imports)
