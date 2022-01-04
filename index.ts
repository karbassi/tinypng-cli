#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import request from "request";
import minimatch from "minimatch";
import glob from "glob";
import arrayUniq from "array-uniq";
import chalk from "chalk";
import prettyBytes from "pretty-bytes";

// TODO: Add support for --cache
// import md5File from "md5-file";

const argv = require("minimist")(process.argv.slice(2));
const home =
  process.env["HOME"] || process.env["HOMEPATH"] || process.env["USERPROFILE"];
const version = require("./package.json").version;

let openStreams = 0;

function help(): void {
  console.log(
    "Usage\n" +
      "  tinypng <path>\n" +
      "\n" +
      "Example\n" +
      "  tinypng .\n" +
      "  tinypng assets/img\n" +
      "  tinypng assets/img/test.png\n" +
      "  tinypng assets/img/test.jpg\n" +
      "\n" +
      "Options\n" +
      "  -k, --key        Provide an API key\n" +
      "  -r, --recursive  Walk given directory recursively\n" +
      "  --width          Resize an image to a specified width\n" +
      "  --height         Resize an image to a specified height\n" +
      "  --force          Ignore caching to prevent repeat API requests\n" +
      "  --dry-run        Dry run -- no files actually modified\n" +
      // "  --prefix         The target file prefix\n" +
      // "  --suffix         The target file suffix\n" +
      // "  -c, --cache      Cache map location. Defaults to ~/.tinypng.cache.json\n" +
      "  -v, --version    Show installed version\n" +
      "  -m, --max        Maximum to run at a time. Defaults to -1 (no max)\n" +
      "  -h, --help       Show help"
  );
}

function getKey(): string {
  let key = "";
  if (argv.k || argv.key) {
    if (typeof (argv.k || argv.key) === "string") {
      key = (argv.k || argv.key).trim();
    }
  } else if (fs.existsSync(`${home}/.tinypng`)) {
    key = fs.readFileSync(`${home}/.tinypng`, "utf8").trim();
  }

  return key;
}

function main(): void {
  if (argv.v || argv.version) {
    console.log(version);
    return;
  } else if (argv.h || argv.help) {
    help();
    return;
  }

  console.log(chalk.underline.bold("TinyPNG CLI"));
  console.log("v" + version + "\n");

  const isRecursive: boolean = argv.r || argv.recursive;
  const files: [] = argv._.length ? argv._ : ["."];
  // const prefix: string = argv.prefix ?? "prefix";
  // const suffix: string = argv.suffix ?? "suffix";

  const key: string = argv["dry-run"] ? "dry-run-key" : getKey();
  const resize: { width?: number; height?: number } = {};
  let max = Number(argv.m || argv.max ? argv.m || argv.max : -1);

  // TODO: Add support for --cache
  /*
  let cacheMap = new Map();
  const cacheMapLocation =
    typeof (argv.c || argv.cache) === "string"
      ? (argv.c || argv.cache).trim()
      : `${home}/.tinypng.cache.json`;

  if (fs.existsSync(cacheMapLocation)) {
    cacheMap = require(cacheMapLocation);
    if (typeof cacheMap !== "object") {
      cacheMap = {};
    }
  }
  */

  if (argv.width) {
    if (typeof argv.width === "number") {
      resize.width = argv.width;
    } else {
      console.log(
        chalk.bold.red(
          "Invalid width specified. Please specify a numeric value only."
        )
      );
    }
  }

  if (argv.height) {
    if (typeof argv.height === "number") {
      resize.height = argv.height;
    } else {
      console.log(
        chalk.bold.red(
          `Invalid height specified. Please specify a numeric value only.`
        )
      );
    }
  }

  if (key.length === 0) {
    console.log(
      chalk.bold.red(
        `No API key specified. You can get one at ${chalk.underline(
          "https://tinypng.com/developers"
        )}.`
      )
    );
    return;
  }

  let images: string[] = [];

  files.forEach((file: string): void => {
    if (!fs.existsSync(file)) {
      return;
    }

    if (fs.lstatSync(file).isDirectory()) {
      images = images.concat(
        glob.sync(
          file + (isRecursive ? "/**" : "") + "/*.+(png|jpg|jpeg|PNG|JPG|JPEG)"
        )
      );
    } else if (
      minimatch(file, "*.+(png|jpg|jpeg|PNG|JPG|JPEG)", {
        matchBase: true,
      })
    ) {
      images.push(file);
    }
  });

  // TODO: Add support for --cache
  // const unique = argv.force ? arrayUniq(images) : pruneCached(arrayUniq(images), cacheMap);

  const unique = arrayUniq(images);

  if (unique.length === 0) {
    console.log(
      chalk.bold.red(
        "\u2718 No previously uncompressed PNG or JPEG images found.\n"
      ) + chalk.yellow("  Use the `--force` flag to force recompression...")
    );
    return;
  }
  console.log(
    chalk.bold.green(
      `✔ Found ${unique.length} image${unique.length === 1 ? "" : "s"} \n`
    )
  );
  console.log(chalk.bold("Processing..."));

  let processed = 0;
  unique.forEach((file) => {
    if (max === 0) {
      return;
    } else {
      max = max - 1;
    }
    openStreams = openStreams + 1;

    if (argv["dry-run"]) {
      console.log(chalk.yellow(`[DRY] Panda will run for '${file}'`));
      return;
    }

    fs.createReadStream(file).pipe(
      request.post(
        "https://api.tinify.com/shrink",
        {
          auth: {
            user: "api",
            pass: key,
          },
        },
        (error, response, body) => {
          openStreams = openStreams - 1;
          processed += 1;

          try {
            body = JSON.parse(body);
          } catch (e) {
            console.log(
              chalk.red(`\u2718 Not a valid JSON response for '${file}'`)
            );
            return;
          }

          if (error || !response) {
            console.log(chalk.red(`\u2718 Got no response for '${file}'`));
            return;
          }

          if (response.statusCode !== 201) {
            if (body.error === "TooManyRequests") {
              console.log(
                chalk.red(
                  `\u2718 Compression failed for '${file}' as your monthly limit has been exceeded`
                )
              );
            } else if (body.error === "Unauthorized") {
              console.log(
                chalk.red(
                  `\u2718 Compression failed for '${file}' as your credentials are invalid`
                )
              );
            } else {
              console.log(chalk.red(`\u2718 Compression failed for '${file}'`));
            }
          }

          if (body.output.size >= body.input.size) {
            console.log(
              chalk.yellow(`\u2718 Couldn’t compress '${file}' any further`)
            );
            return;
          }
          // const dstFileName = path.join(
          //   path.dirname(file),
          //   `${prefix}${path.basename(file)}${suffix}`
          // );
          const dstFileName = path.join(
            path.dirname(file),
            `${path.basename(file)}`
          );

          const sizeDiff = prettyBytes(body.input.size - body.output.size);
          const sizeDiffPercentage = Math.round(
            100 - (100 / body.input.size) * body.output.size
          );

          console.log(
            chalk.green(
              `✔ (${processed}/${
                unique.length
              }) Panda just saved you ${chalk.bold(
                `${sizeDiff} (${sizeDiffPercentage}%)`
              )} for "${file}"->"${dstFileName}"`
            )
          );

          const fileStream = fs.createWriteStream(dstFileName);

          // TODO: Add support for --cache
          /*
          openStreams = openStreams + 1;
          fileStream.on("finish", function () {
            cacheMap[file] = md5File.sync(file);
            openStreams = openStreams - 1;
          });
          */

          if (
            resize.hasOwnProperty("height") ||
            resize.hasOwnProperty("width")
          ) {
            request
              .get(body.output.url, {
                auth: {
                  user: "api",
                  pass: key,
                },
                json: {
                  resize: resize,
                },
              })
              .pipe(fileStream);
          } else {
            request.get(body.output.url).pipe(fileStream);
          }
        }
      )
    );
  });

  // TODO: Add support for --cache
  /*
  // Save the cacheMap on wet runs
  if (!argv["dry-run"]) {
    const saveCacheMapWhenCompvare = () => {
      if (openStreams > 0) {
        return setTimeout(saveCacheMapWhenCompvare, 100);
      }
      fs.writeFileSync(cacheMapLocation, JSON.stringify(cacheMap, null, "\t"));
    };
    setTimeout(saveCacheMapWhenCompvare, 500);
  }
  */
}

// TODO: Add support for --cache
/*
function pruneCached(
  images: string[],
  cacheMap: { [x: string]: string }
): string[] {
  return images.filter((image) => {
    if (cacheMap[image] && md5File.sync(image) == cacheMap[image]) {
      return false;
    }
    return true;
  });
}
*/

main();
