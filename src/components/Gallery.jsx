import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef } from "react";

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance) {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach((key) => {
    if (key !== "constructor" && typeof instance[key] === "function") {
      instance[key] = instance[key].bind(instance);
    }
  });
}

function createTextTexture(gl, text, font = "bold 30px monospace", color = "black") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(parseInt(font, 10) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  constructor({ gl, plane, renderer, text, textColor = "#545050", font = "30px sans-serif" }) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }
  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    const aspect = width / height;
    const textHeight = this.plane.scale.y * 0.15;
    const textWidth = textHeight * aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
}

class Media {
  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    renderer,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius = 0,
    font,
  }) {
    this.extra = 0;
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }
  createShader() {
    const texture = new Texture(this.gl, { generateMipmaps: false });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          if(d > 0.0) {
            discard;
          }
          
          gl_FragColor = vec4(color.rgb, 1.0);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }
  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program,
    });
    this.plane.setParent(this.scene);
  }
  createTitle() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
      textColor: this.textColor,
      fontFamily: this.font,
    });
  }
  update(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);

      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }
  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
      if (this.plane.program.uniforms.uViewportSizes) {
        this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height];
      }
    }
    this.scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class App {
  constructor(
    container,
    {
      items,
      bend,
      textColor = "#ffffff",
      borderRadius = 0,
      font = "bold 30px Figtree",
      scrollSpeed = 2,
      scrollEase = 0.05,
    } = {}
  ) {
    document.documentElement.classList.remove("no-js");
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck, 200);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.update();
    this.addEventListeners();
  }
  createRenderer() {
    this.renderer = new Renderer({ alpha: true });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  }
  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }
  createScene() {
    this.scene = new Transform();
  }
  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100,
    });
  }
  createMedias(items, bend = 1, textColor, borderRadius, font) {
    const defaultItems = [
      { image: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAA81BMVEX/////zRAFv87uFwAAYP+VvxUgW2f/3mP/1z/N8vXA7/L0c2b6xb9Zl/8zf/9Me4W/1/9c1d/M3//5raXuIgyqy0N5nKP5+/Pz9vfU5aGlvcL//ff/5IL///3O4ZTC0tX5s6zy9+Ty+/zq8v+F3+YuydaXvv8Oaf8HZP9qov/z9/+NuP86hP+ixf/o+Pp2qf9Qkf+u6u8kdv8Yb/9jnf/a5///66D/55D/9tf/8cH/+ef/4G7/2Un/6p7/7Kn1g3f4opj98O6gxS4+cXvxQzDyUD/82NTI3YbzZla41GOOq7FgipP2jYHwNiPn8cy0yMzX4eMxIJgYAAACPElEQVR4nO3YbVcSQRTA8XFhV1DKIhFEUSHJfOw5TSgFnyLL/P6fJspXe/eyZzjnrnvM/+/1zCz/M8Ob6xwAAAAAAAAAAAAAPG6dOQNl9eid6jPVyyw6NgMTXSXl1VZR93p7x7zjuU3H2Jw8endCxl971h1ls44gEEdXUzqKxX3jEKOH9c9B/Og3qSFvjUPsXlYQiH/Jk9SQp4QQQgghhBBCCCGEEEIIIYQQQgghDykkw3HQdmqI9TjovxnQua5Zxzt5dNqVvLfucJ1Nm5RuosO53Q8TMrY+ZjGP75QNHOhnf6qq7GfxAAAAwKOy8nn23h3W7TuOSjN5+GLdsZJLxtixcci3vEJWjUN6eYX0jUNm8wopEUIIIYQQQgghhBBCCCGEEEIIIYQ8pJCveYX0jENymzQeGYfkNWo8tO5w7ni1X7pn/Z75fQAAAADwV4+btKwRk81PqZzM+zgdJLe21oZh3HBZ+cL6QhR31rTPGJwXPC1uyL31WphUa8llzShpwTzkwrdjXHIp9l4pHWG4JlY1lI4oWjfuGPh3FArfxWb5ru6MxCrtQqJoyThkY5qQRbFZ7QhrYtWSGmL9tl4QQgghhBBCCCGEEEIIIYQQQgghhGQZUpkm5NwrRI6Dfqgh18YhbpqQn2LvSA25Eqtu1RDzoempf8eFnP62tQndsC0/ob2tM/tBduWXZ8d8cm87OfwdJTq0kutMBvKXFR/KMN651s1y3I36hcbvZsxtFhkAAAAAAAAAAAAAAOAPSySVWyT/TdAAAAAASUVORK5CYII=`, text: "TinkerHub" },
      { image: `https://cdn.shopify.com/s/files/1/1268/5407/files/what-is-ieee-802.3.jpg?v=1591386495`, text: "IEEE" },
      { image: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAABd1BMVEX///8QnVhChvXqQjX5uwT///7///38/////v3//f////v8//0PnldChvP4vAX8/v/rQjP/vgD5twBChfgAlEQAmlLsQTYAmkkAmEwPn1T6tADmIQDrQTroRDPoMRgQnFvg8+cfefEAlEA+iPL+1dT7xMP77Obv+vHG6tnH49XynZnrST3oNCbuIRPnNRPwe3Z9wJn21tA/sm/wqqTrOS213Mb3y8XqPCHwdmyc07TwaF7zi4NtvpT30tKl1LrzmI9Yt371ubOGyaXrVU7/8u8mp2j1qKVDq3RguIn5mIfwIgDsQSnnxcamVox+a7hbe9p1dcmhaKTPT2Ha4fi0W3uIsflfe+DMUldakfTYSU/wh3jh7PymY5SjvfnEVnFrnvaObayrX4ZYrGP+y1zGtCV1pvz72X+dri785bR2p0K/1/n98tbdthBKokn53pFgp0H3yDmwsSuKqj20y/pppi3P3sGUt/n+4az+783A0vv5xDD72If5zFKHNX1AAAAKtklEQVR4nO2b/V8T2RWHb17u3MydSTKZSSAJJGFAARWyuoKIuIoKqyvt6palZUspbRFKwVpbWnXVP77nDG8hM5O5gSHww3mIfhQyYb4572cmjBEEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAE0RM0kZFc04SUWuRzua4LDmhckz04tZjIcIMJ/IdgPOq5nPv/dfUx4Fzltev3Rg90RjI2fmN87ILPKWZGb94aqE9MTDa/uRepcei2Wewvl4dLD2/04tTOi86FZAvfDFhWymOqXrvDNINpgR4IPxj7tlgyEx6l4rdD4KtMjw7eS0NmQB+7W58arKWOsCYfw09EYBbhbLqYONTnaRx+aEA4qrn2pSAh7u7NTID9rGOJtb7mfSa4HnjA7HCrQKA8PAuJqsen3RWjD+qpWspKWX1HCgdTg/WbXu7xM140zVMK4X/lxfFen7QChs65ZHmWmXtppQIYuOM/Jp/RxvoTAZheOLK8uErOyoUm8hiAE4ECU1O3AuJQYw9LQQobZmn4tsHklaqOBlR49l1tAlwyEKt+z3eMxo1ioAnh0SiXH12CjA7A2z16vz5lWdZgX5DCwaU53zEae1QOUugFo2lepXDkkEDF48mpYPMd5dOAw+YDnfS4chRfHLY5lx2POjjok/pEB31erlloP04ws5NADMfiUw6mvnSFgt15VrcGg1PMMfVr/iOHOyrEOlIuTcPz8j3XdJqF+9CihWSYEyb8qSZC4YHM8uJQzxUdAb0mtJXsZscAPMKa8FXEDOtvREuE6vhwjGlSuwxDGtCnXK/PKOhL1awBX3XT2aKCQIjHSnkWK27vBUKjeedBPdo/PRNOPfMdL9jTjrn0iEoj0Z+Y7r0+YGFuwEr11aL1ARPfB7zAjcCK7/dTs2EWnw/1TpgudAPij30PFV5JHdJcMHwvJBn0L43OJeNEZhHmKuwserDLOTjV76wJRfN5JpwTvqkWOtVpGC1Uso2H18jpvWhWM4bAGakPSqCqDS3r6I1pfR3IHfMlRRMipf7GeE9smGf640kIQHiomvDlKBP+qRamI6NRUbYhtuTF+YvcV+GmRaIB70a2aC3UUn1T9YDp8JCxxTLEorLISqXshaMuLsJbDyvSNWjRlDMMuHKqfsvXkh5jMP5iuJTowlXNUgUqh9AvaDwW0KLVrZpSCTzAmpp5wsJ32bgwvrGoVjSQBk5WxUXcOl5IPAr9h5cvm82lJWWBU5NzIiDJHMP1POTYR/1KpT/hTY4Js3IyV8WJFBr/zW9/fJV99fqn3zWXcNNkDYaWC9xD1W6l6vfDHbQV/Xax0oC6XlH21eJTXA7FqE8zhLb8ynWcZBIeyVc/N6cwh4Qm09pgzerDXXAH+51i6PlwoouMk6iUzelY50ZN01ZcJ5vNJpNZ+HKSv/9Ds+NEWEtN1Z9gsGRUk9642U1tBDP2P1d899QwVp2sA9KcZDaLlsw6r2tLHST2DcxhKsjzaCN6vqaDPWbLquHobavMcnkoHnG6ZFwDgck2nJ+aS0GLp75Ura/+YLTr3wP1/2GxZHbRx1XKY6pR0BlQuOI4I+0KR5zsz82lmk9iLTVTu65w3TBAIoRjMVFJmGruakJDFIc+HMaXXWfECVCYfPVL06ewb/Iu1JXuBR5YY7qkGo64x+mfjUOgJrTVbDbAS/E7zo+100O+NfnHBaHpZ6nHgnsin5YVNeKzirEUfr7mtqtr0TnyJ6yOWBmxG68/C+9BVRl7oV454lmNy/VQhVA6IEL/3LSwxFupiaXrZ4i/NiAcxxcV06pZmY9BIOMbvizT4qrw5bz+ZQanxQG8FHrunZiBhXy6HLLxb1PYKJ1fH9NY1pdlWmwIIuHPX5ZmJu8vCEPycwcGOgG8TU9V+vFKYziGDlVjoQJbw/Gvd7Bux3T1VoPMOvY3MFFkdSzG0oMnIyVit7OxDJVTY7HcZQCOMLZZeNOP29IIhTGUfJ2tRhsRHdndyjMRU6+ob1fT6Vzh71FxaJbj2IXzFV8tDBDota378ZiQ7eTsXK6aswu5f3T2UnMxht8m2K4LJx+eT1vD0dkFPz2HSomJZu+znT6i8PafDTMRtq8yS7djUKhx5npThQLZpLu6Js9+twje6Cc3q8f6bDtXKLypJBphrerwUAwKmQYlX8mCmFKdpLuSP3PVh1L4DlQdK8zl4FGAcGyE5NT5OIaLPLzIiJuNjMVjOzru/pmL4k66mm5RaKO7gh1z/wrOqfGYEMHO1PE332G4SagculRPO/hUeFf23ldP1LWSg3A8uERzKgqHH8V2CZzvuo5iKB5q3FjTePC9bMHAkC+37XSwQMw4hX+XGo1WjZUErqPiukNMSBgRs4rBiEA4fsirC8SnQgCCfwZLxB8UCv9BfeaJBWfBgFpMBRgGvvyWq+6mSVznJPfVFbJPORsTS6gVc2k7jeFYOso4eIE/D8NrnCvFtVU3GTAJdzDj6hrjcBaygydpjEO07n2tBgtr99W3YMdGI9Ho/+//YlR2CGSDfWhdujCjM4KNXCb45lkPntGgBMrtKlpPAbBjIffmzZu3Xy5iqQ+G4MYHVznd4PbYcdx11uEaAyQjwT7a6JuhOabdWwt29au8kOsyXPIM52sbHVYapxV6Y+UINHLhH0mQutjDFtSr7UoCbfj6JC72Quly1sXlhXpidVc0KQLupfS+81HJO1v81P54lk1lV3C2j67aRY/jbPCAj1JIA+ywrZZhDh3UTtvb0JvzC75LGu9P+uBGT8WtDrsS/GER8TGkhwlRmP66502gsV6wCDgtyI1dhGMSY9Hd9SdUzgwJOUbZS+GJEIAS2484a2AYBt/Nut5SWMlbnZGAkiHZppoyrCTQ8Lzrga5jcFPE99FVw/dwpwAjtr+GzqSS/SDLFtLpKgRgXB2aChkOD46NnGLGyW75bGgo5lEcEavv91jHy+WxwwXHXpVDI6dUNSCf+l5DsK8qAjH+cjvY/pxjd3AOpdqvjlfZnShvdf07MVFQctF0tacB2AYUJ7mO8392JMJb3WX/0dGlAjy0unnJH9szoDpuKWyq/Ao5syMV2vbnvctQdYI0sANgy1HhmE26a76DRWS3beegRYMptxf1LwKsHB1bVcf1HWOwz6G5NIc10K5+kVfmk7NC5iPmqg3fmWrsS6hCG/cW0KIxrcNw2VMyTGIjF6rRcf0bDV186mBDaNEYCrzoOUKVvDeS7o6ENatZ1z+ywql/DrfhO7zpTRqcX61PzEoMx5G20oi9q7vu77g0wXbstnSay3mTMLZoVxSZX/E1cg58rQZdrgEjbtq+2R6mQJyRetmhdUNG495G7pQNs46b5wEnDIM/y/mmp2rhE86AVyT8fHBoVjWcq04Z0VnjXuVsA3QY8nTFAMHvcAbM5AOef2WApnwdrwF4tzDAX+5G+PIbLLWNq25vF2Vji3ZlA7AVnTP9g+Ndy3Ecd2O5w1yHVzb2Nm3vEhO0aJt7zLhauTMQKBya5GJ3fWtj68OveX5wXTcY7q3g5M6Xzfdfv+zgp/kvZhMaMxqUsYNPYmtMQg7NhNsQwhaGaeNQFRg0f55L5ARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEMf8H2/zD2cIEKAUAAAAAElFTkSuQmCC`, text: "GDG" },
      { image: `https://picsum.photos/seed/5/800/600?grayscale`, text: "Core.ai" },
      { image: `https://picsum.photos/seed/16/800/600?grayscale`, text: "CodeCatalyst" },
      { image: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASQAAACsCAMAAADlsyHfAAAAmVBMVEX///8mjd0Ag9qJuuljpOMAhdv0+f0AetiOverb6/lXoOIAgtofi9wAftkYidwOh9vj7/rP4/Zyrubv9vzE3PSz0vHi7vp7s+eUwOvK3/Wjye7q8/u41fFFmeCcxe01k97V5vcAd9dsquUvkd5XouL19fSpyurX3uXK3PN8sOahxeh7pdDC1OaWvOH//PmduNXo6+5tsujp5+RLUI3PAAANRUlEQVR4nO1da5uiOBYmYPCSkCioIBehwHG7d2Z7Z/b//7jNSYDCEhSVLkF5P3Q9iqbhNeeakxNNGzFixIgRI0b8Jqxnu2ffQu9hEG4dn30TfQdGiMbPvom+g1GEmPPsu+g5IkESnj/7LnqOlAmSRtV9GR5HiI+a+zKOQnOz2bPvoudYgXmbPPsueo6lPvoAV2FSiigyn30bPUcsfAAePPsueo4DkJQ8+y56DhccpfDZd9Fz+OAoec++i55jDT6A++y76AXMnWdPFrUQOolmh/pri4m72VaGCeNs/7Rn+M3YTabWwTVmdTCETkLIq702m7l29sG8Ikuwsyi11k99lN+FbWSlq+bLB0z1S3GJ42eWmj5z4XgiZnR7d/2Ab02Wl66bbnRNb29wJDwpR3idCJFXnEn2dPP4IGZEEpl6Qtx+fLTewbCSTsaxccpB2KJORusXNtML2ugmRKDgXzIUDojf0UgbDByxi9ptoEi7ko4VGDYkFNNLwFlXfuzA6kjYAiyV9ouEeDuM8adB32cdDSuNP8MdjfZsyBWiqEgPLTpy/BagtJnNuzICT0Ysf/JCLjoKIWZg/GmkLV4kbjsSULBIT/8QL5yPbjKOwDylwld6lWTBRqpYxFiiacuPbnLXwo2kkOF1006G6wGCCDwaRHVP2067IcmJcJaIv8YLLT3NLDmZ8GLdEUmCefnvK5GkJVTmiCju2Ga/FEmamUqRE1a702FfiyRY4lci97PLQV+NJO1fsYxIUZdjvhxJQn/rFLFDlyO+IEnaKmZRp+vXr0hSZ35SgZckaT6SdB0jSS0wktQCI0ktMJLUAiNJLTCS1AIjSS3wIEln23IaSDKXyY9w30HFwVPwAEnOLCaEfFnaPCEpSELfcydRxomuc8zxQKsE7idpwzg9zyFUSdroOuacMSpTMnLxYZhLl3eTdCTy0b+WR1RJwiU5BQZauNSWpJWXxllslxu65MI/J5x8WQCukGRaJTkUwDhZdHPT341rJJlBIn79Hdc5gwfVF7mqziiifB+YTnL6+epMmmDGOMdC5mgWTWzDH+qeuWaSzHm4tyMxW8Rjh2oJClLimfz8kYtXSc23ThS3kbr7Y7haOgPfl1JHUrA6ijcXRMwA2HqzUIXc4hVnKE9kRrRhi8C7+EnhVCdCqNJc7UJ1305HPDS1wBCaSBfi5+CmgrZ3IUkwgpeaZoPWwTqLU01LBElyp7LH5cxa4aYy5HchSTDAt5rmUpr54VZe3hKEVU1NTJEegI7i9db8XUiaE7nB3WC0dJADq9jOvecIb2BHDq4vRHoXkpaCpAQkq6J2BElq5sx1xFxJVVI73ruQ5BDEdzBn6KejqMP8AZjC4B3AA8A/asd7F5Jg2oRqFVy8MLcgV7xsDBBRIYVr3rRJ8J1I2igH0ksjKuN8inhe7S1IirU5bmoU8EYkASPgQIoIXjlEGeU5KZIk7e39JMEA3wuS9Dw4BaGLaeEXxSBusHW5vqr9bUgSTqSn4nyKMc9A3KKCJIdJb9JXTuU53oYkNW2Eu8TcTaLKKQ6UqjKmtfK1A17s2Fqeltu+DUli2riwMafiC6WMqbJaIWcyvehy0Fjpz1i3TvLcb0PShFJb5sxwGXrY4B1pciMSZfANUyVOKC0cqBwvRJIZzPPfv44kmzJ4VKviC7kqRvGFxeNKOc1ZniXAJ5XbAycpmK/Wx71hTxaxiO6xnm8sriFJMAJKWa9MEhHIZb4bc9jPlr/lHAhnDBP7dcQtJIRgWLuQ6WaZlJf7uepIykNb4WVvtOXuaKRy6wjl8D1aae623Rv79ZevD5kkRz9fuZBhfB1JnorakCCFCV45MiGiVWXf0ZUGeEMmaW6dMkRpnqyuI0kwwrV8N5P8sAkLSJxjvri6Bjtkkkwq5EyuXWBMiMXihatUSR1JwlMkmtoXBzqIE1Pb2e7MX7XoNTlkkrRlCos6nh/ukmWVljqShJ23xJ+FoJSQODWONyx2DJqkJtSRFGL2If649n59cwvOtyFpHRl374J/NZJ+wc7JsT7pMv4Nimck6RJ8xMHOjyQ1wtwjTBHVRpIaYXoc6q/GmdQMZ6ZzmXP0Eg1I6nb0lyDJnEFpCMWZr2ZQYI3bS7/A9BhkFPHhcyF/zqIuBW74JO2hFpSSSVJ904xIh63th06SD7OI6vb26wV32l1R7LBJCjNh9BlPzygS8Ked9WwdMknJQheChidngqVy3WurqxYjwyXJsQlQFJ1VvyaIWHISbVnczcEkgyXJ14XV5+g8q+hAOTpWVccLvZP2UAMlKVhAD2Ts1hj6jcxcMyTpcbvoyDlQkkJwHnmc1F3z8/S+LtNH/kcH6nuIJJk2ESSQhr5ty2INRZePtrMef8IBkjRHvBSnc/zSVqgo1kZg9wKEHm03MTySZF8ynNaGHcc4/lOo7gXOl40wlPuZB/Kg+h4cSa5e6psz7AmlfCLoM4oNV1hGuo+q74GRFMDKPaNJ7UVTLnUzJK6uec4Sj2Hh+zh9qPGkIGn+YzD7bdZS1CYN9xvgT7sWRDwXOdl7cvXQrjTD9gjGfz0wwjdiDxxdaFmflUJmKrlUnEHZWoCy+xshz2S7afyfuwf4RqS40MUNSHBVyDaFL4AjcL8n96vvmWqohwfQ3B0EiF5uQ/spZFCFtM3yV4xBPs74uPfMO8M+8E8F12MEIEus0eUJDU9qKje3/kgKmV2KHMjoZnpne1bXzUei/W46vQXLxeImE2PoTDUX/fXf0q5ByzK/FMCDAwXKi7ts1ERQ7MuN3hT3+HDBrVwuanzEOZEPIL2nZVwIGexey/tz5i56ENN7vG8prSusFFOTbX06ltL0N+vNo+JFV58ohYzMwN8u3G8CBZWTO7pQz6eS2b8nqgVxg5f2bJigj/AFf7DYDcEPwS+tatcgrbQvX8EkmE1vbq7tFvsIPaIUXC8PPYUG65eVQRmtHaTLl2S5kFG0E4LC81c8m8OW5RstuWOV2jpUKu7i6UJPAhRa61fiisJ1ZEwqJnNSsAZVy05URrzCM0jIbep7UunYslXsk94dwxiISc6vGu+wsGP6PzJzuydVITNI4RmIaeTEvG55pQH+x8mHJftdLup1gwlDtEX7nW1h1dA/0uFclXaNzisRL4vFM6fT1up7/fElg+ARhnvXngR2X+E2nq6ZWzWKqNQZn3YNNG3FGRcqxvtoqb430zP9s3L7d64CNMdoWe3olyKmtM6seC19A7cQOUj8hh8V9R0u0oZfwb07lPlWrBo3fdZgXogYZVLk1ri0a0vYZVGJeOe4rKnYWJTVnQbj+CTrnfKphdBIehsFMmOQHzEnuVOkXMcvEW/FGV+ByUuWgED8F+L/CJZVJDs/slBXp1b9ZixxK60NZyPyWPzsv8JCQ+dp8JOIt2iPL08j0VJLQTKHrRMQPXYH02FLdci4iqNezBbtL8oLEZO2uxQyDvLlqxMpkA5+wlbNJDjohnmnM6mb9fFvgghI2hwdobaMIOKKqORvo5gulqR3GReKCuR2jlgxkwrIE3EHkFBrAmwsbpPDPxQKOt7+0v73p161ap8Rr/TbhTNOKanOzjmQ1DvXpz18jlrVPGzLYE1296m4jjKAKNNK0jfws+gkdxawYZ+XOKEtz40wixBXekFq6UlZNal+E1a436yGc0gy0EFpoSpM2v747FkRlahj3oqIV+gpefkzrXQet8nD4W4I5/qFRG9l2xTsYlMkgyZA2uYzj6si3lzk+PmAKThKQ22FCE1q9NZZCafstAoncwl9XLqOTBKwUiJX0/7Hg9YSA3Ecz2Ewitrnfoxc7wATsitC6ToSWaRkQlqJ0fMBj/B+DxNp7bCgt5jmuV6SJBR2okHN4JeIF5O4ZmZCoqHbM3O+ExFlN1TQmkVhkhI5kJ8EFa6BSt87tQHrkg/ZB4hlF5bWWJz0CdCB38+k0oV8C7B74oMPCWZGW/nbBVJWJSkP3rwyqdTMt/QBepe3bgeHoptmkn0yk0Bhg7nfFVbPavziAapVer7O3wTokHVL4OmeteWQs6coD7QaDeXaYnioiluIG72hEm/Nv3KUVwRoMi/ALuSldrNBpGlroRrStcQuXwcoW+DkVg7EaI05ZgNVOtcgFCpvG3iqpW7GUzuVzZTKqEQ6ks5xqEdnXIWw6a0S3Foxj/BBTRczWO2j/IzOXpcUdQC3tebeSN18uhi+hmCN1q2DvBQgsdpK3gyV4/4y64RZ43SwKZC2MFmhUy5/TEayuOY0zs1wjVZ7CHm7XsKxlptN+GDD+EcBFSXsSiLAheYb+uLlxaoZP9mV+ukQphFHr27CLsJk9GtrzCpWYOfppUrBt0CoIopavbSSK/84Sr75nvoHuZhP+XlN0EZ6i6xtXc5r46f0EzmaVVTzMkw5UETJ4UUjslvhyfhChGMo9Y7hxp9NMl0WHgmbNtiFoM6RRHreQ5NxjLk6pY8yPFJ0gjDWeTWjJhjixjCq0L4TySwiOhz2KGaTTmJjMBVW3wxztfEMw9hvVn3dAzNixIgRI0aMGDFixIgRI0aMGHEb/g8t57CyKIQy7QAAAABJRU5ErkJggg==`, text: "IEDC" },
    ];
    const galleryItems = items && items.length ? items : defaultItems;
    this.mediasImages = galleryItems.concat(galleryItems);
    this.medias = this.mediasImages.map((data, index) => {
      return new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend,
        textColor,
        borderRadius,
        font,
      });
    });
  }
  onTouchDown(e) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.touches ? e.touches[0].clientX : e.clientX;
  }
  onTouchMove(e) {
    if (!this.isDown) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const distance = (this.start - x) * (this.scrollSpeed * 0.025);
    this.scroll.target = this.scroll.position + distance;
  }
  onTouchUp() {
    this.isDown = false;
    this.onCheck();
  }
  onWheel(e) {
    const delta = e.deltaY || e.wheelDelta || e.detail;
    this.scroll.target += delta > 0 ? this.scrollSpeed : -this.scrollSpeed;
    this.onCheckDebounce();
  }
  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }
  onResize() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height,
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    if (this.medias) {
      this.medias.forEach((media) => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }
  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    if (this.medias) {
      this.medias.forEach((media) => media.update(this.scroll, direction));
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update.bind(this));
  }
  addEventListeners() {
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnTouchDown = this.onTouchDown.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchUp = this.onTouchUp.bind(this);
    window.addEventListener("resize", this.boundOnResize);
    window.addEventListener("mousewheel", this.boundOnWheel);
    window.addEventListener("wheel", this.boundOnWheel);
    window.addEventListener("mousedown", this.boundOnTouchDown);
    window.addEventListener("mousemove", this.boundOnTouchMove);
    window.addEventListener("mouseup", this.boundOnTouchUp);
    window.addEventListener("touchstart", this.boundOnTouchDown);
    window.addEventListener("touchmove", this.boundOnTouchMove);
    window.addEventListener("touchend", this.boundOnTouchUp);
  }
  destroy() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.boundOnResize);
    window.removeEventListener("mousewheel", this.boundOnWheel);
    window.removeEventListener("wheel", this.boundOnWheel);
    window.removeEventListener("mousedown", this.boundOnTouchDown);
    window.removeEventListener("mousemove", this.boundOnTouchMove);
    window.removeEventListener("mouseup", this.boundOnTouchUp);
    window.removeEventListener("touchstart", this.boundOnTouchDown);
    window.removeEventListener("touchmove", this.boundOnTouchMove);
    window.removeEventListener("touchend", this.boundOnTouchUp);
    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
    }
  }
}

export default function CircularGallery({
  items,
  bend = 3,
  textColor = "#ffffff",
  borderRadius = 0.05,
  font = "bold 30px Figtree",
  scrollSpeed = 2,
  scrollEase = 0.05,
}) {
  const containerRef = useRef(null);
  useEffect(() => {
    const app = new App(containerRef.current, { items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase });
    return () => {
      app.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase]);
  return <div className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing" ref={containerRef} />;
}
