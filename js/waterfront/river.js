/* Nirmal simulation — js/waterfront/river.js
 * River surface shader, promenade and bridges. */
'use strict';

function riverfront() {
  // The river surface is continuous; bridges span it without intersecting water.
  const uniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uSun: { value: new T.Vector3(1, 1, 1).normalize() },
  };
  const mat = new T.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec3 vWorld; varying vec2 vUv;'
      + ' void main(){vUv=uv; vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;'
      + 'gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: 'uniform float uTime; uniform float uNight; uniform vec3 uSun;'
      + ' varying vec3 vWorld; varying vec2 vUv;'
      + ' void main(){float a=sin(vWorld.z*1.8+uTime*1.4+sin(vWorld.x*.6));'
      + 'float b=sin(vWorld.x*3.1-vWorld.z*.7+uTime*.9);'
      + 'vec3 n=normalize(vec3(a*.055,1.,b*.05));vec3 v=normalize(cameraPosition-vWorld);'
      + 'float fres=pow(1.-max(dot(v,n),0.),3.);'
      + 'float glint=pow(max(dot(reflect(-uSun,n),v),0.),100.);'
      + 'vec3 col=mix(vec3(.25,.47,.46),vec3(.69,.77,.71),fres);'
      + 'col+=glint*vec3(.7,.49,.22)*.6;'
      + 'col=mix(col,vec3(.03,.10,.15)+fres*vec3(.08,.14,.2),uNight);'
      + 'col+=(a+b)*.008;gl_FragColor=vec4(col,1.);\n'
      + '#include <tonemapping_fragment>\n#include <colorspace_fragment> }',
  });
  river = new T.Mesh(new T.PlaneGeometry(58, 3000), mat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(247, -0.07, 0);
  river.receiveShadow = false;
  scene.add(river);

  box('sand', 211, -0.9, 0, 8, 2, 838);
  box('paving', 201, 0.35, 0, 13, 0.4, 825);
  box('stone', 216, 0.6, 0, 1.2, 1, 830);
  box('grass', 287, 0.03, 0, 16, 0.1, 1000);

  for (let z = -395; z <= 395; z += 16) {
    palm(199, z, rr(9, 12));
    bench(204, z + 4, -Math.PI / 2);
    lamp(208, z, Math.PI / 2);
    part('cyl', 'metal', 216, 1.2, z, 0.055, 1.8, 0.055);
  }
  box('metal', 216, 1.97, 0, 0.08, 0.08, 825);

  // Bridges.
  for (const z of [-360, -180, 0, 180, 360]) {
    box('stone', 250, 1.4, z, 85, 2, 18);
    box('asphalt', 250, 2.49, z, 85, 0.12, 15);
    for (const s of [-1, 1]) {
      box('stone', 250, 3, z + s * 8.2, 85, 0.5, 0.8);
      box('metal', 250, 3.65, z + s * 8.2, 85, 0.09, 0.1);
      for (let x = 218; x < 291; x += 7) part('cyl', 'metal', x, 3.3, z + s * 8.2, 0.06, 0.8, 0.06);
    }
    for (let x = 230; x <= 280; x += 25) box('concrete', x, 0.6, z, 3, 4, 10);
    box('asphalt', 342, 0.16, z, 96, 0.1, 16);
  }
  sign('RIVER WALK · नदी किनारा', 205, 3, 63, 11, 1.6, Math.PI / 2);
}
