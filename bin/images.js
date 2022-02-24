/**
 * This script is used to convert images to different sizes, used for displaying them
 * on a responsive website using the "srcset" attribute of the "<img>" element or
 * the new "<picture>" element.
 *
 * Don't modify or delete this file, if you want to use the "npm run images" command.
 */

import glob from "fast-glob"
import fs from "fs"
import path from "path"
import trash from "trash"
import mime from "mime-types"
import sharp from "sharp"
import imageConfig from "../images.config.js";

export default class ResponsiveImages {
  constructor(config) {
    this.resizedFilenamePattern = /-([0-9]+x[0-9]+|w[0-9]+|h[0-9]+)\.[a-z]+$/i;
    this.mimeTypes = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/svg+xml"];
    this.files = [];
    this.config = config;
    this.recreate = process.argv.includes("recreate");
    this.remove = process.argv.includes("remove");
    this.timer = {
      start: new Date(),
      end: null,
      diff: 0
    };
    this.stats = {
      removed: 0,
      created: 0,
      skipped: 0
    };

    try {
      this.startTimer();
      this.run();
    } catch (error) {
      this.endTimer();
      this.showError(error);
    }
  }

  /**
   * Fixes collection paths and calls runCollection() for each collection.
   */
  async run() {
    const collectionCount = this.config.collections.length;

    for (let i = 0; i < collectionCount; i++) {
      const collection = this.config.collections[i];
      collection.source = this.trailingSlash(collection.source);
      collection.sourcePath = this.trailingSlash(path.resolve(collection.source));

      await this.runCollection(collection);
    }

    this.showTitle(`Finished Resizing`);
    this.endTimer();
    this.showStats();
  }

  /**
   * Runs all processes for a collection.
   *
   * @param {Object} collection
   */
  async runCollection(collection) {
    this.showTitle(`Collection "${collection.name}"`);

    // 1. Check if the configuration is in a working state

    try {
      this.validateCollectionConfig(collection);
    } catch (error) {
      return this.showError(error);
    }

    // 2. Read all files in the collection's source path

    let files = {};

    try {
      const unsortedFiles = await this.getFiles(collection);
      files = this.filterFiles(unsortedFiles);
    } catch (error) {
      return this.showError(error);
    }

    const fileCount = files.original.length;

    if (fileCount === 0) {
      return this.log("No images found.\n");
    }

    this.log(`${fileCount} original image ${fileCount < 2 ? "file" : "files"} found.\n`);

    // 3. Remove existing resized images, if the argument "remove" or "create" is used

    if (this.remove || this.recreate) {
      if (this.remove) {
        this.log("Removing resized image formats.");
        this.removeFiles(files.resized);
        this.log("");
        return;
      }

      this.log("Removing resized image formats.");
      this.removeFiles(files.resized);
      this.log("");
    }

    // 4. Resize the images using sharp()

    await this.resizeImages(files.original, collection.sizes);
  }

  /**
   * Validates a collection configuration and throws an error if parts are
   * missing or invalid.
   *
   * @param {Object} collection
   * @throws {Error}
   */
  validateCollectionConfig(collection) {
    // 1. Validate the source path

    if (!this.isValidSource(collection.sourcePath)) {
      throw new Error(`The directory ${collection.sourcePath} does not exist or is not readable!`);
    }

    // 2. Validate size configurations

    if (!collection["sizes"] || collection.sizes.length === 0) {
      throw new Error("No sizes configured!");
    }

    collection.sizes.forEach((size, index) => {
      if (!size["name"]) {
        throw new Error(`Missing name property for sizes[${index}]!`);
      }

      if (!size["width"] && !size["height"]) {
        throw new Error(`No width or height set for size "${size.name}"!`);
      }
    });
  }

  /**
   * Checks if the source for a collection exists and is a
   * valid directory.
   *
   * @param {String} source
   * @return {Boolean}
   */
  isValidSource(source) {
    let sourceExists = true;

    try {
      if (!fs.existsSync(source)) {
        sourceExists = false;
      }

      const stat = fs.statSync(source);

      if (!stat.isDirectory()) {
        sourceExists = false;
      }
    } catch (error) {
      sourceExists = false;
    }

    return sourceExists;
  }

  /**
   * Reads all files of a collection, based on the "source" that is
   * set to be used.
   *
   * @param {Object} collection
   */
  async getFiles(collection) {
    let files = [];
    let globPath = `${collection.source}${collection["recursive"] ? "**/*.*" : "*.*"}`;

    try {
      files = await glob(globPath, {
        dot: false,
        absolute: true,
        onlyFiles: true
      });
    } catch (error) {
      switch (error.errno) {
        case -13:
          throw new Error(`Permission denied for directory "${collection.path}"`);
        default:
          throw error;
      }
    }

    return files;
  }

  /**
   * Filters the list of files by mime type, etc. and returns an object containing
   * original files, resized ones and those which are ignored.
   *
   * {
   *   original: [],
   *   resized: [],
   *   ignored: []
   * }
   *
   * @param {Array} files
   */
  filterFiles(files) {
    let filtered = {
      original: [],
      resized: [],
      ignored: []
    };

    files.forEach(file => {
      const mimeType = mime.lookup(file);

      if (!this.mimeTypes.includes(mimeType)) {
        return filtered.ignored.push(file);
      }

      if (this.resizedFilenamePattern.test(file)) {
        return filtered.resized.push(file);
      }

      filtered.original.push(file);
    });

    return filtered;
  }

  /**
   * Removes all resized files (detected by filename).
   *
   * @param {Array} files
   */
  removeFiles(files) {
    files.forEach(async file => {
      const mimeType = mime.lookup(file);

      if (this.mimeTypes.includes(mimeType) && this.resizedFilenamePattern.test(file)) {
        this.log(`  => ${file}`);

        if (this.config.settings.useTrash) {
          await trash(file);
        } else {
          await fs.unlinkSync(file);
        }

        this.stats.removed++;
      }
    });
  }

  /**
   * Runs the resizing process for all images of a collection,
   * based on the configuration.
   *
   * @param {Array} files
   * @param {Array} sizes
   */
  async resizeImages(files, sizes) {
    const fileCount = files.length;
    const sizeCount = sizes.length;

    for (let i = 0; i < fileCount; i++) {
      const file = files[i];
      this.log(`Resizing image ${i + 1} of ${fileCount} (${file})`);

      for (let j = 0; j < sizeCount; j++) {
        const size = sizes[j];

        await this.resizeImage(file, size);
      }

      this.log("");
    }
  }

  /**
   * Resizes a single image, based on tze size config that is passed.
   * Options that are needed, but not set, will use defaults.
   *
   * @param {String} file    The file (including path and filename)
   * @param {Object} config  The size configuration from the collection
   */
  async resizeImage(file, config) {
    const filename = this.addFilenamePostfix(file, config);
    const targetFile = `${path.dirname(file)}/${filename}`;

    this.log(`  => ${filename}`);

    if (fs.existsSync(targetFile)) {
      this.stats.skipped++;
      return;
    }

    const resizeOptions = {
      width: config["width"],
      height: config["height"],
      fit: config["fit"] || "cover",
      position: config["position"] || "center"
    };

    await sharp(file).resize(resizeOptions).toFile(targetFile);

    this.stats.created++;
  }

  /**
   * Adds a postfix to a filename, based on the sizing that is passed as config
   * and defined in the configuration file.
   *
   * Example:
   *  - lonely-cat-1110x457.jpg    Resized version with a fixed width and height
   *  - lonely-cat-w800.jpg        Resized version with a fixed width
   *  - lonely-cat-h400.jpg        Resized version with a fixed height
   *
   * @param {String} file
   * @param {Object} config
   */
  addFilenamePostfix(file, config) {
    let filename = path.basename(file);
    const extension = path.extname(file);

    if (config["width"] && config["height"]) {
      filename = filename.replace(RegExp(`${extension}$`), `-${config["width"]}x${config["height"]}${extension}`);
    } else if (config["width"]) {
      filename = filename.replace(RegExp(`${extension}$`), `-w${config["width"]}${extension}`);
    } else if (config["height"]) {
      filename = filename.replace(RegExp(`${extension}$`), `-h${config["height"]}${extension}`);
    }

    return filename;
  }

  /**
   * Prints a title, using the # character to create some
   * visual styling.
   *
   * @param {String} title
   */
  showTitle(title) {
    const length = title.length;
    const line = "#".repeat(length + 4) + "\n";
    const output = [line, `# ${title} #\n`, line].join("");

    this.log(output);
  }

  /**
   * Displays an error in a formatted way.
   *
   * @param {Error} error
   */
  showError(error) {
    this.log(`### ERROR: ${error.message}\n`);
  }

  /**
   * Displays the statistics.
   */
  showStats() {
    this.log(`Script Runtime:\n${this.round(this.timer.diff / 1000, 2)}s\n`);
    this.log(`File Stats:`);

    const stats = {
      created: String(this.stats.created),
      skipped: String(this.stats.skipped),
      removed: String(this.stats.removed)
    };

    const maxLength = Math.max(stats.created.length, stats.skipped.length, stats.removed.length) + 1;

    if (this.remove || this.recreate) {
      this.log(`${stats.removed.padStart(maxLength, " ")}  image files removed`);
    }

    if (this.stats.created > 0) {
      this.log(`${stats.created.padStart(maxLength, " ")}  image files created`);
    }

    if (this.stats.skipped > 0 && !this.remove && !this.recreate) {
      this.log(`${stats.skipped.padStart(maxLength, " ")}  image files skipped`);
    }
  }

  /**
   * Uses console.log() or later may be a debugging service, etc.
   * to log information.
   *
   * @param  {...any} args
   */
  log(...args) {
    console.log(...args);
  }

  /**
   * Adds a trailing slash to the end of a given path, if it is missing.
   *
   * @param {String} path
   */
  trailingSlash(path) {
    if (!/\/$/.test(path)) {
      path += "/";
    }

    return path;
  }

  /**
   * Sets the start date object for the timer.
   */
  startTimer() {
    this.timer.start = new Date();
  }

  /**
   * Sets the end date object for the timer and returns the
   * amount of milliseconds between start and end.
   *
   * @return {Number}  The number of milliseconds since the timer started
   */
  endTimer() {
    this.timer.end = new Date();
    this.timer.diff = this.timer.end - this.timer.start;

    return this.timer.diff;
  }

  /**
   * Rounds a number with a given amount of decimals.
   *
   * @param {number} value
   * @param {number} decimals
   */
  round(value, decimals) {
    return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
  }
}

new ResponsiveImages(imageConfig);
