import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const mount = document.createElement('div');
mount.id = 'ponypoll-root';
mount.style.cssText = 'height:100%;';
document.body.appendChild(mount);

ReactDOM.render(<App />, mount);
