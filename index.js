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
  refractive_index;
  constructor(
    diffuse_color,
    albedo = [1, 0, 0, 0],
    specular_exponent = 0,
    refractive_index = 1
  ) {
    this.diffuse_color = diffuse_color;
    this.albedo = albedo;
    this.specular_exponent = specular_exponent;
    this.refractive_index = refractive_index;
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
    if (dist_info.dist < 0) dist_info.dist = t1;
    if (dist_info.dist < 0) return false;
    return true;
  }
}

function reflect(I, N) {
  return I.subtract(N.multiply(2 * I.dot(N)));
}

function refract(I, N, refractive_index) {
  let cosi = -Math.max(-1, Math.min(1, I.dot(N)));
  let etai = 1,
    etat = refractive_index;
  let n = N;
  if (cosi < 0) {
    cosi = -cosi;
    [etai, etat] = [etat, etai];
    n = N.multiply(-1);
  }
  const eta = etai / etat;
  const k = 1 - eta ** 2 * (1 - cosi ** 2);
  return k < 0
    ? new Vec3(0, 0, 0)
    : I.multiply(eta).add(n.multiply(eta * cosi - Math.sqrt(k)));
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
        material.refractive_index = spheres[i].material.refractive_index;
      }
    }
  }
  return sphere_dist < 1000;
}

function cast_ray(orig, dir, spheres, lights, depth = 0, envmap) {
  const material = {};
  const hit_info = {
    hit: new Vec3(0, 0, 0),
    N: new Vec3(0, 0, 0),
  };
  if (depth > 4 || !scene_intersect(orig, dir, spheres, material, hit_info)) {
    let u = Math.max(
      0,
      Math.min(
        envmap.width - 1,
        Math.floor(
          (Math.atan2(dir.z, dir.x) / (2 * Math.PI) + 0.5) * envmap.width
        )
      )
    );
    let v = Math.max(
      0,
      Math.min(
        envmap.height - 1,
        Math.floor((Math.acos(dir.y) / Math.PI) * envmap.height)
      )
    );
    const index = (u + v * envmap.width) * 4;
    return new Vec3(
      envmap.data[index] / 255,
      envmap.data[index + 1] / 255,
      envmap.data[index + 2] / 255
    );
  }
  let diffuse_light_intensity = 0;
  let specular_light_intensity = 0;

  const reflect_dir = reflect(dir, hit_info.N).normalize();
  const reflect_orig =
    reflect_dir.dot(hit_info.N) < 0
      ? hit_info.hit.subtract(hit_info.N.multiply(1e-3))
      : hit_info.hit.add(hit_info.N.multiply(1e-3));
  const reflect_color = cast_ray(
    reflect_orig,
    reflect_dir,
    spheres,
    lights,
    depth + 1,
    envmap
  );

  const refract_dir = refract(dir, hit_info.N, material.refractive_index);
  const refract_orig =
    refract_dir.dot(hit_info.N) < 0
      ? hit_info.hit.subtract(hit_info.N.multiply(1e-3))
      : hit_info.hit.add(hit_info.N.multiply(1e-3));
  const refract_color = cast_ray(
    refract_orig,
    refract_dir,
    spheres,
    lights,
    depth + 1,
    envmap
  );

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
    .add(white.multiply(specular_light_intensity * material.albedo[1]))
    .add(reflect_color.multiply(material.albedo[2]))
    .add(refract_color.multiply(material.albedo[3]));
}

function* render(ctx, envmap) {
  const imgData = ctx.createImageData(width, height);
  const ivory = new Material(
    new Vec3(0.4, 0.4, 0.3),
    [0.6, 0.3, 0.1, 0.0],
    50,
    1
  );
  const red_rubber = new Material(
    new Vec3(0.3, 0.1, 0.1),
    [0.9, 0.1, 0.0, 0.0],
    10,
    1
  );
  const mirror = new Material(
    new Vec3(1.0, 1.0, 1.0),
    [0.0, 10.0, 0.8, 0.0],
    1425,
    1
  );
  const glass = new Material(
    new Vec3(0.6, 0.7, 0.8),
    [0.0, 0.5, 0.1, 0.8],
    125,
    1.5
  );

  const lights = [];
  lights.push(new Light(new Vec3(-20, 20, 20), 1.5));
  lights.push(new Light(new Vec3(30, 50, -25), 1.8));
  lights.push(new Light(new Vec3(30, 20, 30), 1.7));

  const spheres = [];
  spheres.push(new Sphere(new Vec3(-3, 0, -16), 2, ivory));
  spheres.push(new Sphere(new Vec3(-1.0, -1.5, -12), 2, glass));
  spheres.push(new Sphere(new Vec3(1.5, -0.5, -18), 3, red_rubber));
  spheres.push(new Sphere(new Vec3(7, 5, -18), 4, mirror));

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = i + 0.5 - width / 2;
      const y = -(j + 0.5) + height / 2;
      const z = -height / 2 / Math.tan(fov / 2);
      const dir = new Vec3(x, y, z).normalize();
      const color = cast_ray(new Vec3(0, 0, 0), dir, spheres, lights, 0, envmap);
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
