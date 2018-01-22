import React from 'react';

import Sketch from './Sketch';

const sketchOptions = {
  alpha: false,
  depth: false,
  stencil: false,
  antialias: true,
  preserveDrawingBuffer: true,
  failIfMajorPerformanceCaveat: false
};

const App = () => (
  <div className="app">
    <Sketch options={sketchOptions} />
  </div>
);
export default App;
