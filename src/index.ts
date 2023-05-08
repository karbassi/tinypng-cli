import { Command } from "commander";

const program = new Command();

program
  .version("1.0.0")
  .description(
    "Handy command line tool for shrinking PNG images using the TinyPNG API"
  )
  .option("-k, --key <value>", "Provide an API key")
  .option("-r, --recursive", "Walk given directory recursively")
  .option("--width <value>", "Resize an image to a specified width")
  .option("--height <value>", "Resize an image to a specified height")
  .option("--force", "Ignore caching to prevent repeat API requests")
  .option("--dry-run", "Dry run -- no files actually modified")
  .option(
    "--prefix <value>",
    "The target file prefix(default is 'tinypng-', set to empty string will replace original file)"
  )
  .option(
    "-c, --cache <value>",
    "Cache map location. Defaults to ~/.tinypng.cache.json"
  )
  .option("-v, --version", "Show installed version")
  .option(
    "-m, --max <value>",
    "Maximum to run at a time. Defaults to -1 (no max)"
  )
  .parse(process.argv);

const options = program.opts();

function pruneCached(images, cacheMap) {
  return images.filter(function (image) {
    if (cacheMap[image] && md5File.sync(image) == cacheMap[image]) {
      return false;
    }
    return true;
  });
}

function main() {
  // if (argv.v || argv.version) {
  //   console.log(version);
  //   return;
  // } else if (argv.h || argv.help) {
  //   help();
  //   return;
  // }

  // console.log(chalk.underline.bold("TinyPNG CLI"));
  // console.log("v" + version + "\n");

  const files = argv._.length ? argv._ : ["."];
  const prefix = typeof argv.prefix === "string" ? argv.prefix : "tinypng-";

  let key = "";
  const resize = {};
  let max = Number(argv.m || argv.max ? argv.m || argv.max : -1);

  if (!argv["dry-run"]) {
    if (argv.k || argv.key) {
      key =
        typeof (argv.k || argv.key) === "string"
          ? (argv.k || argv.key).trim()
          : "";
    } else if (fs.existsSync(home + "/.tinypng")) {
      key = fs.readFileSync(home + "/.tinypng", "utf8").trim();
    }
  } else {
    key = "dry-run-key";
  }

  let cacheMap = {};
  const cacheMapLocation =
    typeof (argv.c || argv.cache) === "string"
      ? (argv.c || argv.cache).trim()
      : home + "/.tinypng.cache.json";

  if (fs.existsSync(cacheMapLocation)) {
    cacheMap = require(cacheMapLocation);
    if (typeof cacheMap !== "object") {
      cacheMap = {};
    }
  }

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
          "Invalid height specified. Please specify a numeric value only."
        )
      );
    }
  }

  if (key.length === 0) {
    console.log(
      chalk.bold.red(
        "No API key specified. You can get one at " +
          chalk.underline("https://tinypng.com/developers") +
          "."
      )
    );
    return;
  }
  let images = [];

  files.forEach(function (file) {
    if (!fs.existsSync(file)) {
      return;
    }
    if (fs.lstatSync(file).isDirectory()) {
      images = images.concat(
        glob.sync(
          file +
            (argv.r || argv.recursive ? "/**" : "") +
            "/*.+(png|jpg|jpeg|PNG|JPG|JPEG)"
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

  const unique = argv.force
    ? uniq(images)
    : pruneCached(uniq(images), cacheMap);

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
      `\u2714 Found ${unique.length} image${unique.length === 1 ? "" : "s"} \n`
    )
  );
  console.log(chalk.bold("Processing..."));

  let processed = 0;
  unique.forEach(function (file) {
    if (max === 0) {
      return;
    } else {
      max = max - 1;
    }
    openStreams = openStreams + 1;

    if (argv["dry-run"]) {
      console.log(chalk.yellow("[DRY] Panda will run for `" + file + "`"));
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
        function (error, response, body) {
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
            console.log(chalk.red("\u2718 Got no response for `" + file + "`"));
            return;
          }
          if (response.statusCode !== 201) {
            if (body.error === "TooManyRequests") {
              console.log(
                chalk.red(
                  "\u2718 Compression failed for `" +
                    file +
                    "` as your monthly limit has been exceeded"
                )
              );
            } else if (body.error === "Unauthorized") {
              console.log(
                chalk.red(
                  "\u2718 Compression failed for `" +
                    file +
                    "` as your credentials are invalid"
                )
              );
            } else {
              console.log(
                chalk.red("\u2718 Compression failed for `" + file + "`")
              );
            }
          }
          if (body.output.size >= body.input.size) {
            console.log(
              chalk.yellow(
                "\u2718 Couldn’t compress `" + file + "` any further"
              )
            );
            return;
          }
          const dstFileName = path.join(
            path.dirname(file),
            `${prefix}${path.basename(file)}`
          );

          console.log(
            chalk.green(
              `\u2714 (${processed}/${unique.length}) Panda just saved you ` +
                chalk.bold(
                  pretty(body.input.size - body.output.size) +
                    " (" +
                    Math.round(
                      100 - (100 / body.input.size) * body.output.size
                    ) +
                    "%)"
                ) +
                ` for "${file}"->"${dstFileName}"`
            )
          );

          const fileStream = fs.createWriteStream(dstFileName);

          openStreams = openStreams + 1;
          fileStream.on("finish", function () {
            cacheMap[file] = md5File.sync(file);
            openStreams = openStreams - 1;
          });

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

  // Save the cacheMap on wet runs
  if (!argv["dry-run"]) {
    const saveCacheMapWhenCompvare = function () {
      if (openStreams > 0) {
        return setTimeout(saveCacheMapWhenCompvare, 100);
      }
      fs.writeFileSync(cacheMapLocation, JSON.stringify(cacheMap, null, "\t"));
    };
    setTimeout(saveCacheMapWhenCompvare, 500);
  }
}

// main();

if(options.)
