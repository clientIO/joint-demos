import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders JointJS paper', () => {
	render(<App />);
	const paper = document.querySelector('.joint-paper');
	expect(paper).toBeInTheDocument();
});
