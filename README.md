# TinyPNG CLI

> Handy command line tool for shrinking PNG images using the TinyPNG API

## Installation

```sh
npm install -g tinypng-cli
```

### Use this Repository

```sh
git clone git@github.com:karbassi/tinypng-cli.git
cd tinypng-cli
npm i
npm link
```

## Preamble

To use TinyPNG CLI, you need an API key for TinyPNG. You can get one at [https://tinypng.com/developers](https://tinypng.com/developers).

## Usage

TinyPNG CLI allows you to provide your API key in two different ways. The more convenient one is to save the API key into a file called `.tinypng` within your home directory. The other way is to provide it as an option while running the CLI.

```sh
tinypng demo.png -k E99a18c4f8cb3EL5f2l08u368_922e03
```

To shrink all PNG images within the current directory.

```sh
tinypng .
```

Custom Output prefix(default is `tinypng-`, `--prefix=""` for replace)

```sh
tinypng . --prefix="output-"
```

To shrink all PNG images within the current directory and subdirectoies, use the `-r` flag

```sh
tinypng . -r
```

To shrink all PNG images within a specific directory (`assets/img` in this example), you may run the following command.

```sh
tinypng assets/img
```

Need to limit the number of compressions at a time? Use the `-m, --max` flag:

```sh
tinypng assets/img --max 100
```

You may also provide multiple directories.

```sh
tinypng assets/img1 assets/img2
```

To shrink a single PNG image (`assets/img/demo.png` in this example), you may run the following command.

```sh
tinypng assets/img/demo.png
```

You may also provide multiple single PNG images.

```sh
tinypng assets/img/demo1.png assets/img/demo2.png
```

To resize an image, use the `--width` and/or `--height` flag.

```sh
tinypng assets/img/demo.png --width 123
tinypng assets/img/demo.png --height 123
tinypng assets/img/demo.png --width 123 --height 123
```

By default, this tool caches a map of all compressed images sent to the API in `~/.tinypng.cache.json`. To change this directory, use the `-c, --cache` flag:

```sh
tinypng . -r --cache /path/to/myCache.json
```

If you want to forcibly recompress assets, use the `--force` flag. For a dry run output of all files that will be sent to the API, use the `--dry-run` flag.

That's it. Pretty easy, huh?

## Changelog

### 0.0.9

- Support default `prefix` and custom `prefix`
- Refactor code, reduced `if` indentation depth
- Display running progress

### 0.0.8

- Implement cache map support and support for forcing compression
- Implement dry-run support
- Implement maximum runs support to enable batching

### 0.0.7

- Implement support for uppercase file extensions

### 0.0.6

- Prevent any file changes in case JSON parsing fails or any other HTTP error occurred

### 0.0.5

- Add support for image resize functionality

### 0.0.4

- Make recursive directory walking optional

### 0.0.3

- Updated API endpoint
- Check for valid JSON response

### 0.0.2

- JP(E)G support

### 0.0.1

- Initial version

## TODO

- Documentation
- Tests
- Fix `Not a valid JSON response for` and `Connection error`: https://github.com/websperts/tinypng-cli/issues/12 and https://github.com/websperts/tinypng-cli/issues/21, https://github.com/websperts/tinypng-cli/issues/22
- Fix `space in filename` https://github.com/websperts/tinypng-cli/issues/23
- Fix `empty Size`: https://github.com/websperts/tinypng-cli/issues/18

## License

Copyright (c) 2022 karbassi
Copyright (c) 2017 [websperts](http://websperts.com/)
Licensed under the MIT license.

See LICENSE for more info.

## Contributors

- [@rasshofer](https://github.com/rasshofer)
- [@maxkueng](https://github.com/maxkueng)
- [@tholu](https://github.com/tholu)
- [@mvenghaus](https://github.com/mvenghaus)
- [@jblok](https://github.com/jblok)
- [@tomatolicious](https://github.com/tomatolicious)
- [@kolya182](https://github.com/kolya182)
