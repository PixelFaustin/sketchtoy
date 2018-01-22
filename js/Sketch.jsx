import React, { Component } from 'react';
import { bool, shape, func } from 'prop-types';
import { vertexShaderSource, fragmentShaderSource } from './shaders';

function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

const NO_NORMALIZE = false;

class Sketch extends Component {
  constructor(props) {
    super(props);

    this.cursorInside = false;
    this.cursorPressed = false;
    this.cursorDebounce = false;
    this.isTimingInput = false;
  }

  state = {
    repaintHook: undefined
  };

  componentDidMount = () => {
    if (this.canvas) {
      this.gl = this.canvas.getContext('webgl', this.props.options);

      if (!this.gl) {
        this.props.catchContextSetupError(this.canvas);
        return;
      }

      this.animationLoopTimer = new Date().getTime();
      this.setState({
        repaintHook: requestAnimationFrame(this.animate)
      });

      this.canvas.addEventListener('mouseenter', this.inside);
      this.canvas.addEventListener('mouseout', this.outside);
      this.canvas.addEventListener('mousemove', this.handleCanvasStroke);
      this.canvas.addEventListener('mousedown', this.mouseDown);
      this.canvas.addEventListener('mouseup', this.mouseUp);

      this.setupShading();
    }
  };

  componentWillUnmount = () => {
    cancelAnimationFrame(this.state.repaintHook);
    this.canvas.removeEventListener('mouseenter', this.inside);
    this.canvas.removeEventListener('mouseout', this.outside);
    this.canvas.removeEventListener('mousemove', this.handleCanvasStroke);
    this.canvas.addEventListener('mousedown', this.mouseDown);
    this.canvas.addEventListener('mouseup', this.mouseUp);
  };

  setupShading = () => {
    const vertices = [1, 1, -1, 1, -1, -1, -1, -1, 1, -1, 1, 1];
    const indices = [0, 1, 2, 3, 4, 5];

    const positionVBO = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionVBO);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );
    this.positionVBO = positionVBO;

    const indexVBO = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexVBO);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      this.gl.STATIC_DRAW
    );
    this.indexVBO = indexVBO;
    this.indexCount = indices.length;

    const vertexShader = compileShader(
      this.gl,
      this.gl.VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = compileShader(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    // TODO: error check all of this
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      // eslint-disable-next-line
      alert(
        `Unable to initialize the shader program: ${this.gl.getProgramInfoLog(
          program
        )}`
      );
      return;
    }
    this.gl.useProgram(program);
    this.positionAttribLocation = this.gl.getAttribLocation(
      program,
      'a_position'
    );
    this.resolutionUniformLocation = this.gl.getUniformLocation(
      program,
      'u_resolution'
    );
    this.cursorNDCUniformLocation = this.gl.getUniformLocation(
      program,
      'u_cursorNDC'
    );
    this.oldCursorNDCUniformLocation = this.gl.getUniformLocation(
      program,
      'u_oldCursorNDC'
    );
    this.timeUniformLocation = this.gl.getUniformLocation(program, 'u_time');
    this.colorUniformLocation = this.gl.getUniformLocation(program, 'u_color');
    this.program = program;

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
  };

  inside = () => {
    this.cursorInside = true;
    this.canvas.onselectstart = () => false;
  };

  outside = () => {
    this.cursorInside = false;
    this.canvas.onselectstart = () => true;
  };

  mouseDown = () => {
    this.cursorPressed = true;
    this.debounce = false;
  };

  mouseUp = () => {
    this.cursorPressed = false;
  };

  handleCanvasStroke = ({ offsetX, offsetY }) => {
    const { width, height } = this.canvas;

    this.canvasX = offsetX;
    this.canvasY = Math.abs(offsetY - height);

    this.oldCanvasNDCX = this.canvasNDCX;
    this.oldCanvasNDCY = this.canvasNDCY;

    this.canvasNDCX = this.canvasX / width * 2.0 - 1.0;
    this.canvasNDCY = this.canvasY / height * 2.0 - 1.0;

    this.debounce = false;
  };

  resize = () => {
    // Get current canvas size from browser
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    // Check if canvas size matches browser size
    if (
      this.canvas.width !== displayWidth ||
      this.canvas.height !== displayHeight
    ) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }
  };

  animate = () => {
    this.resize();

    if (this.cursorPressed && !this.debounce) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVBO);
      this.gl.vertexAttribPointer(
        this.positionAttribLocation,
        2,
        this.gl.FLOAT,
        NO_NORMALIZE,
        0,
        0
      );
      this.gl.enableVertexAttribArray(this.positionAttribLocation);
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);

      this.gl.useProgram(this.program);
      this.gl.uniform2fv(this.resolutionUniformLocation, [
        this.canvas.width,
        this.canvas.height
      ]);

      this.gl.uniform2fv(this.cursorNDCUniformLocation, [
        this.canvasNDCX,
        this.canvasNDCY
      ]);
      this.gl.uniform2fv(this.oldCursorNDCUniformLocation, [
        this.oldCanvasNDCX || this.canvasNDCX,
        this.oldCanvasNDCY || this.canvasNDCY
      ]);
      this.gl.uniform3fv(this.colorUniformLocation, [
        Math.random(),
        Math.random(),
        Math.random()
      ]);
      this.gl.uniform1f(this.timeUniformLocation, new Date().getTime());

      this.gl.drawElements(
        this.gl.TRIANGLES,
        this.indexCount,
        this.gl.UNSIGNED_SHORT,
        0
      );

      this.debounce = true;
    }

    requestAnimationFrame(this.animate);
  };

  render() {
    return (
      <canvas
        id="sketch-canvas"
        ref={canvas => {
          this.canvas = canvas;
        }}
      />
    );
  }
}

Sketch.defaultProps = {
  options: shape({
    alpha: true,
    depth: false,
    stencil: false,
    antialias: true,
    preserveDrawingBuffer: true,
    failIfMajorPerformanceCaveat: false
  }),
  catchContextSetupError(canvas) {
    canvas.outerHTML = '<br> Your browser does not support WebGL </br>';
  }
};

Sketch.propTypes = {
  options: shape({
    alpha: bool,
    depth: bool,
    stencil: bool,
    antialias: bool,
    preserveDrawingBuffer: bool,
    failIfMajorPerformanceCaveat: bool
  }),
  catchContextSetupError: func
};

export default Sketch;
