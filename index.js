import Vec3 from "./vec3.js";

const width = 1024;
const height = 768;

const fov = Math.PI / 2;

const bkg_color = new Vec3(0.2, 0.7, 0.8);

function* render(ctx) {
  const imgData = ctx.createImageData(width, height);

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const index = (i + j * width) * 4;
      imgData.data[index] = bkg_color[0] * 255;
      imgData.data[index + 1] = bkg_color[1] * 255;
      imgData.data[index + 2] = bkg_color[2] * 255;
      imgData.data[index + 3] = 255;
    }
    yield imgData;
  }
  return null;
}

export default render;
