import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from '../App';

export function mount(div: HTMLElement) {
    ReactDOM.render(<App />, div);
}
