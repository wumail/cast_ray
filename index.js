import Vec3 from "./vec3.js";

const width = 1024;
const height = 768;

const fov = Math.PI / 2;

const bkg_color = new Vec3(0.2, 0.7, 0.8);
const white = new Vec3(1, 1, 1);

class Light {
  position;
  intensity;
  constructor(position, intensity) {
    this.position = position;
    this.intensity = intensity;
  }
}

class Material {
  diffuse_color;
  albedo;
  specular_exponent;
  constructor(diffuse_color, albedo = [1, 0, 0, 0], specular_exponent = 0) {
    this.diffuse_color = diffuse_color;
    this.albedo = albedo;
    this.specular_exponent = specular_exponent;
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

function reflect(I, N) {
  return I.subtract(N.multiply(2 * I.dot(N)));
}

function scene_intersect(orig, dir, spheres, material, hit_info) {
  let sphere_dist = Infinity;
  for (let i = 0; i < spheres.length; i++) {
    const dist_info = {
      dist: Infinity,
    };
    if (spheres[i].ray_intersect(orig, dir, dist_info)) {
      if (dist_info.dist < sphere_dist) {
        hit_info.hit = orig.add(dir.multiply(dist_info.dist));
        hit_info.N = hit_info.hit.subtract(spheres[i].center).normalize();

        sphere_dist = dist_info.dist;
        material.diffuse_color = spheres[i].material.diffuse_color;
        material.albedo = spheres[i].material.albedo;
        material.specular_exponent = spheres[i].material.specular_exponent;
      }
    }
  }
  return sphere_dist < 1000;
}

function cast_ray(orig, dir, spheres, lights) {
  const material = {};
  const hit_info = {
    hit: new Vec3(0, 0, 0),
    N: new Vec3(0, 0, 0),
  };
  if (!scene_intersect(orig, dir, spheres, material, hit_info)) {
    return bkg_color;
  }
  let diffuse_light_intensity = 0;
  let specular_light_intensity = 0;
  for (let i = 0; i < lights.length; i++) {
    const light_dir = lights[i].position.subtract(hit_info.hit).normalize();
    const light_distance = lights[i].position
      .subtract(hit_info.hit)
      .getLength();

    const shadow_orig =
      light_dir.dot(hit_info.N) < 0
        ? hit_info.hit.subtract(hit_info.N.multiply(1e-3))
        : hit_info.hit.add(hit_info.N.multiply(1e-3));
        
    const shadow_hit_info = {
      hit: new Vec3(0, 0, 0),
      N: new Vec3(0, 0, 0),
    };
    const tmpMaterial = {};
    if (
      scene_intersect(
        shadow_orig,
        light_dir,
        spheres,
        tmpMaterial,
        shadow_hit_info
      ) &&
      shadow_hit_info.hit.subtract(shadow_orig).getLength() < light_distance
    ) {
      continue;
    }
    diffuse_light_intensity +=
      lights[i].intensity * Math.max(0, light_dir.dot(hit_info.N));
    specular_light_intensity +=
      Math.pow(
        Math.max(0, reflect(light_dir, hit_info.N).dot(dir)),
        material.specular_exponent
      ) * lights[i].intensity;
  }
  return material.diffuse_color
    .multiply(diffuse_light_intensity * material.albedo[0])
    .add(white.multiply(specular_light_intensity * material.albedo[1]));
}

function* render(ctx) {
  const imgData = ctx.createImageData(width, height);
  const ivory = new Material(new Vec3(0.4, 0.4, 0.3), [0.6, 0.3, 0.1, 0.0], 50);
  const red_rubber = new Material(
    new Vec3(0.3, 0.1, 0.1),
    [0.9, 0.1, 0.0, 0.0],
    10
  );

  const lights = [];
  lights.push(new Light(new Vec3(-20, 20, 20), 1.5));
  lights.push(new Light(new Vec3(30, 50, -25), 1.8));
  lights.push(new Light(new Vec3(30, 20, 30), 1.7));

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
      const color = cast_ray(new Vec3(0, 0, 0), dir, spheres, lights);
      const index = (i + j * width) * 4;
      imgData.data[index] = Math.max(Math.min(color[0], 1), 0) * 255;
      imgData.data[index + 1] = Math.max(Math.min(color[1], 1), 0) * 255;
      imgData.data[index + 2] = Math.max(Math.min(color[2], 1), 0) * 255;
      imgData.data[index + 3] = 255;
    }
    yield imgData;
  }
  return null;
}

export default render;
