import { defineHook } from "@directus/extensions-sdk";

export default defineHook(({ action }, { services, logger, env }) => {
  const { AssetsService, FilesService } = services;
  const quality = env.EXTENSIONS_SANE_IMAGE_SIZE_UPLOAD_QUALITY ?? 60;
  const maxSize = env.EXTENSIONS_SANE_IMAGE_SIZE_MAXSIZE ?? 2400;
  // const format = env.EXTENSIONS_SANE_IMAGE_SIZE_FORMAT ?? "avif";
  // const qualityPerFormat = env.EXTENSIONS_SANE_IMAGE_SIZE_UPLOAD_QUALITY_PER_FORMAT ?? null;

  action("files.upload", async ({ payload, key }, context) => {
    if (payload.optimized !== true) {
      // const transformation = getTransformation(payload.type, quality, format, qualityPerFormat, maxSize);
      const transformation = getTransformation(payload.type, quality, maxSize);
      // console.log(JSON.stringify(transformation,null, 2));
      if (transformation !== undefined) {
        const serviceOptions = { ...context, knex: context.database };
        const assets = new AssetsService(serviceOptions);
        const files = new FilesService(serviceOptions);

        const { stream, stat } = await assets.getAsset(key, transformation);
        if (stat.size < payload.filesize) {
          await sleep(4000);

          // Check for existing thumbnails
          delete payload.width;
          delete payload.height;
          delete payload.size;

          files.uploadOne(
            stream,
            {
              ...payload,
              optimized: true,
            },
            key,
            { emitEvents: false }
          );
        }
      }
    }
  });
});

// function getTransformation(type, quality, format, qualityPerFormat, maxSize) {
function getTransformation(type, quality, maxSize) {
  const format = type.split("/")[1] ?? "";
  if (["jpg", "jpeg", "png", "webp", "tiff", "avif"].includes(format)) {
    const transforms = [
      ['avif', {quality}]
    ];
    // if(qualityPerFormat) {
    //   qualityPerFormat = JSON.parse(qualityPerFormat);
    //   if(Object.hasOwn(qualityPerFormat, format)) quality = parseInt(qualityPerFormat[format]);
    // }
    return {
      transformationParams: {
        format: 'avif',
        quality,
        width: maxSize,
        height: maxSize,
        fit: "inside",
        withoutEnlargement: true,
        transforms,
      },
    };
  }
  return undefined;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
