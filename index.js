#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("node:fs"));
var path = __importStar(require("node:path"));
var request_1 = __importDefault(require("request"));
var minimatch_1 = __importDefault(require("minimatch"));
var glob_1 = __importDefault(require("glob"));
var array_uniq_1 = __importDefault(require("array-uniq"));
var chalk_1 = __importDefault(require("chalk"));
var pretty_bytes_1 = __importDefault(require("pretty-bytes"));
// TODO: Add support for --cache
// import md5File from "md5-file";
var argv = require("minimist")(process.argv.slice(2));
var home = process.env["HOME"] || process.env["HOMEPATH"] || process.env["USERPROFILE"];
var version = require("./package.json").version;
var openStreams = 0;
function help() {
    console.log("Usage\n" +
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
        "  -h, --help       Show help");
}
function getKey() {
    var key = "";
    if (argv.k || argv.key) {
        if (typeof (argv.k || argv.key) === "string") {
            key = (argv.k || argv.key).trim();
        }
    }
    else if (fs.existsSync("".concat(home, "/.tinypng"))) {
        key = fs.readFileSync("".concat(home, "/.tinypng"), "utf8").trim();
    }
    return key;
}
function main() {
    if (argv.v || argv.version) {
        console.log(version);
        return;
    }
    else if (argv.h || argv.help) {
        help();
        return;
    }
    console.log(chalk_1.default.underline.bold("TinyPNG CLI"));
    console.log("v" + version + "\n");
    var isRecursive = argv.r || argv.recursive;
    var files = argv._.length ? argv._ : ["."];
    // const prefix: string = argv.prefix ?? "prefix";
    // const suffix: string = argv.suffix ?? "suffix";
    var key = argv["dry-run"] ? "dry-run-key" : getKey();
    var resize = {};
    var max = Number(argv.m || argv.max ? argv.m || argv.max : -1);
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
        }
        else {
            console.log(chalk_1.default.bold.red("Invalid width specified. Please specify a numeric value only."));
        }
    }
    if (argv.height) {
        if (typeof argv.height === "number") {
            resize.height = argv.height;
        }
        else {
            console.log(chalk_1.default.bold.red("Invalid height specified. Please specify a numeric value only."));
        }
    }
    if (key.length === 0) {
        console.log(chalk_1.default.bold.red("No API key specified. You can get one at ".concat(chalk_1.default.underline("https://tinypng.com/developers"), ".")));
        return;
    }
    var images = [];
    files.forEach(function (file) {
        if (!fs.existsSync(file)) {
            return;
        }
        if (fs.lstatSync(file).isDirectory()) {
            images = images.concat(glob_1.default.sync(file + (isRecursive ? "/**" : "") + "/*.+(png|jpg|jpeg|PNG|JPG|JPEG)"));
        }
        else if ((0, minimatch_1.default)(file, "*.+(png|jpg|jpeg|PNG|JPG|JPEG)", {
            matchBase: true,
        })) {
            images.push(file);
        }
    });
    // TODO: Add support for --cache
    // const unique = argv.force ? arrayUniq(images) : pruneCached(arrayUniq(images), cacheMap);
    var unique = (0, array_uniq_1.default)(images);
    if (unique.length === 0) {
        console.log(chalk_1.default.bold.red("\u2718 No previously uncompressed PNG or JPEG images found.\n") + chalk_1.default.yellow("  Use the `--force` flag to force recompression..."));
        return;
    }
    console.log(chalk_1.default.bold.green("\u2714 Found ".concat(unique.length, " image").concat(unique.length === 1 ? "" : "s", " \n")));
    console.log(chalk_1.default.bold("Processing..."));
    var processed = 0;
    unique.forEach(function (file) {
        if (max === 0) {
            return;
        }
        else {
            max = max - 1;
        }
        openStreams = openStreams + 1;
        if (argv["dry-run"]) {
            console.log(chalk_1.default.yellow("[DRY] Panda will run for '".concat(file, "'")));
            return;
        }
        fs.createReadStream(file).pipe(request_1.default.post("https://api.tinify.com/shrink", {
            auth: {
                user: "api",
                pass: key,
            },
        }, function (error, response, body) {
            openStreams = openStreams - 1;
            processed += 1;
            try {
                body = JSON.parse(body);
            }
            catch (e) {
                console.log(chalk_1.default.red("\u2718 Not a valid JSON response for '".concat(file, "'")));
                return;
            }
            if (error || !response) {
                console.log(chalk_1.default.red("\u2718 Got no response for '".concat(file, "'")));
                return;
            }
            if (response.statusCode !== 201) {
                if (body.error === "TooManyRequests") {
                    console.log(chalk_1.default.red("\u2718 Compression failed for '".concat(file, "' as your monthly limit has been exceeded")));
                }
                else if (body.error === "Unauthorized") {
                    console.log(chalk_1.default.red("\u2718 Compression failed for '".concat(file, "' as your credentials are invalid")));
                }
                else {
                    console.log(chalk_1.default.red("\u2718 Compression failed for '".concat(file, "'")));
                }
            }
            if (body.output.size >= body.input.size) {
                console.log(chalk_1.default.yellow("\u2718 Couldn\u2019t compress '".concat(file, "' any further")));
                return;
            }
            // const dstFileName = path.join(
            //   path.dirname(file),
            //   `${prefix}${path.basename(file)}${suffix}`
            // );
            var dstFileName = path.join(path.dirname(file), "".concat(path.basename(file)));
            var sizeDiff = (0, pretty_bytes_1.default)(body.input.size - body.output.size);
            var sizeDiffPercentage = Math.round(100 - (100 / body.input.size) * body.output.size);
            console.log(chalk_1.default.green("\u2714 (".concat(processed, "/").concat(unique.length, ") Panda just saved you ").concat(chalk_1.default.bold("".concat(sizeDiff, " (").concat(sizeDiffPercentage, "%)")), " for \"").concat(file, "\"->\"").concat(dstFileName, "\"")));
            var fileStream = fs.createWriteStream(dstFileName);
            // TODO: Add support for --cache
            /*
            openStreams = openStreams + 1;
            fileStream.on("finish", function () {
              cacheMap[file] = md5File.sync(file);
              openStreams = openStreams - 1;
            });
            */
            if (resize.hasOwnProperty("height") ||
                resize.hasOwnProperty("width")) {
                request_1.default
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
            }
            else {
                request_1.default.get(body.output.url).pipe(fileStream);
            }
        }));
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
