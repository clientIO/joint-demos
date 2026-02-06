import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import store from './redux/store';
import App from './App';

test('renders JointJS paper', () => {
    render(
        <Provider store={store}>
            <App />
        </Provider>
    );
    const paper = document.querySelector('.joint-paper');
    expect(paper).toBeInTheDocument();
});
