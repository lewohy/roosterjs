import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from '.';

export function mount(div: HTMLElement) {
    ReactDOM.render(<App />, div);
}
