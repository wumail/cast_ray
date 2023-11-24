import Vec3 from "./vec3.js";

const width = 1024;
const height = 768;

const fov = Math.PI / 2;

const bkg_color = new Vec3(0.2, 0.7, 0.8);

class Material {
  diffuse_color;
  constructor(diffuse_color) {
    this.diffuse_color = diffuse_color;
  }
}

class Sphere {
  center;
  radius;
  material;
  constructor(center, radius, material) {
    this.center = center;
    this.radius = radius;
    this.material = material;
  }
  ray_intersect(orig, dir, dist_info) {
    const L = this.center.subtract(orig);
    const tca = L.dot(dir);
    const d = L.dot(L) - tca * tca;
    if (d > this.radius * this.radius) return false;
    const thc = Math.sqrt(this.radius * this.radius - d);
    dist_info.dist = tca - thc;
    const t1 = tca + thc;
    if (dist_info.dist < 0 && t1 < 0) return false;
    return true;
  }
}

function cast_ray(orig, dir, spheres) {
  const material = {};
  let sphere_dist = Infinity;
  for (let i = 0; i < spheres.length; i++) {
    const dist_info = {
      dist: Infinity,
    };
    if (spheres[i].ray_intersect(orig, dir, dist_info)) {
      if (dist_info.dist < sphere_dist) {
        sphere_dist = dist_info.dist;
        material.diffuse_color = spheres[i].material.diffuse_color;
      }
    }
  }
  if (sphere_dist < 1000) {
    return material.diffuse_color;
  }
  return bkg_color;
}

function* render(ctx) {
  const imgData = ctx.createImageData(width, height);
  const ivory = new Material(new Vec3(0.4, 0.4, 0.3));
  const red_rubber = new Material(new Vec3(0.3, 0.1, 0.1));

  const spheres = [];
  spheres.push(new Sphere(new Vec3(-3, 0, -16), 2, ivory));
  spheres.push(new Sphere(new Vec3(-1.0, -1.5, -12), 2, red_rubber));
  spheres.push(new Sphere(new Vec3(1.5, -0.5, -18), 3, red_rubber));
  spheres.push(new Sphere(new Vec3(7, 5, -18), 4, ivory));

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = i + 0.5 - width / 2;
      const y = -(j + 0.5) + height / 2;
      const z = -height / 2 / Math.tan(fov / 2);
      const dir = new Vec3(x, y, z).normalize();
      const color = cast_ray(new Vec3(0, 0, 0), dir, spheres);
      const index = (i + j * width) * 4;
      imgData.data[index] = color[0] * 255;
      imgData.data[index + 1] = color[1] * 255;
      imgData.data[index + 2] = color[2] * 255;
      imgData.data[index + 3] = 255;
    }
    yield imgData;
  }
  return null;
}

export default render;
