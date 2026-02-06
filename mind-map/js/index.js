import 'core-js/stable';
import 'regenerator-runtime/runtime';
import '@joint/plus/joint-plus.css';
import './styles.scss';
import { App } from './src/classes/App';
import { importTreeNode } from './src/actions/tree';
import example from './src/example';

const app = new App(document.getElementById('app'));
app.start();
importTreeNode(app, example);
