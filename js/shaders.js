const vertexShaderSource = `
precision mediump float;

attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
  precision mediump float;

  uniform vec2 u_oldCursorNDC;
  uniform vec2 u_cursorNDC;
  uniform vec2 u_resolution;
  uniform vec3 u_color;
  uniform float u_time;

  float distancePointToLine(vec2 v, vec2 w, vec2 p) {
    // Return minimum distance between line segment vw and point p
    float l2 = pow(length(w-v), 2.0);  // i.e. |w-v|^2 -  avoid a sqrt
    if (l2 == 0.0) return distance(p, v);   // v == w case
    // Consider the line extending the segment, parameterized as v + t (w - v).
    // We find projection of point p onto the line. 
    // It falls where t = [(p-v) . (w-v)] / |w-v|^2
    // We clamp t from [0,1] to handle points outside the segment vw.
    float t = max(0., min(1., dot(p - v, w - v) / l2));
    vec2 projection = v + t * (w - v);  // Projection falls on the segment
    return distance(p, projection);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = (uv * 2.0) - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    vec2 m = u_cursorNDC;
    m.x *= u_resolution.x / u_resolution.y;
    vec2 om = u_oldCursorNDC;
    om.x *= u_resolution.x / u_resolution.y;
    vec3 color = vec3(0.0);

    float brightness = smoothstep(0.05, 0.04, distancePointToLine(om, m, uv));
    color = mix(color, u_color, brightness);
    color *= brightness;
    color += vec3(1.) * smoothstep(0.04, 0.01, distancePointToLine(om, m, uv)) * 0.2;
  
    gl_FragColor = vec4(color, brightness);
  }
`;

export { vertexShaderSource, fragmentShaderSource };
