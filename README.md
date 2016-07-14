
# dep-doc

The **Dependency Doctor** for analyzing and fixing broken references in files.

## Features

- Fixes broken `require` and `import` statements in JavaScript files
- Fixes broken `src` and `href` attributes in HTML files
- Fully cusomizable to support references in any other types of files
- Generates comprehensive reports about all the dependencies in a project
- Comprehensive filtering options
- Blazingly fast asynchronous performance

## Install

Clone the project, then from the project's root directory run  
`npm install --global`

## Command Line Usage

By default, dep-doc will generate a report of broken module references (`require` and `import` statements) by recursing through all the `.js`, `.jsx`, and `.json` files in the directory in which it is launched. It will then list the broken and corrected paths and prompt you to update the files to fix them. Type `y` or just hit `Enter` to make the repairs. All reports list absolute paths, but relative paths will be used to update the files.

![Command line output](img/example1.png)

The program can repair only references broken as a result of files being moved. It cannot yet handle references broken as a result of files being renamed. If a broken reference refers to a filename that is shared by mutliple files in different locations, dep-doc will prompt you to select the correct filepath to use for the corrected reference.

 \<screenshot here>

 Using the command-line options described below, you can generate reports showing which files contain references and which files they refer to. You can filter the searches via command line options or configuration settings in a `.depdocrc` configuration file.

## Command Line Options

Each option has an abbreviated (`-o`) and a full (`--option`) version that can be used interchangeably.

###Directory

- `-d --dir` - Specify the starting directory for parsing. Defaults to the current working directory.

### Error Correction

- `-m default` or `--mode default` - Fix `import` and `require` statements in JavaScript files. This is the default mode if `-m` is omitted.  
- `-m html` or `--mode html` - Fix broken `href` and `src` attributes in HTML files.  
- `-r --read-only` - Don't fix errors, just show the report.  
- `-u --unprompted` - Fix errors without prompting.

### Filtering

All lists of globs, as described below, must be comma-separated and enclosed in quotes.

- `-f --filter-directories <directory-globs>` - Specify a list directory names or globs to exclude from parsing. The names are added to the default list of `'.*,node_modules,build'`.
- `-S --sources <file_globs>` - Specify a glob or series of globs to filter the files that contain (are sources of) references. For example, `'!*Spec.js,*.js'`. Overrides the default filter, which is `'*.js,*.jsx'`.
- `-T --targets [file_glob]` - Specify a glob or series of globs to filter the files that are referenced (targets of references) by other files. Overrides the default filter, which is `'*.js,*.jsx,*.json'`.

### Reporting

- `-e --errors` - List broken references and files containing them.
- `-s --show-sources` - List files that contain (are sources of) references.
- `-t --show-targets` - List files that are referenced (targets of references) by other files.

### Help

- `-h --help` - Produces the following display.

```
-h, --help                                  output usage information
-V, --version                               output the version number
-c, --config <filepath>                     Path of custom configuration file
-m, --mode <default|html>                   Type of references to look for, module import/require references (default) or HTML links (html)
-d, --dir <directory>                       The working directory in which to fix broken references recursively
-f, --filter-directories <directory_globs>  Comma-separated list of directories to exclude from parsing. Quotes required. (e.g., 'test,bin')
-S, --sources <file_globs>                  Filter the sources that are analyzed and repaired
-T, --targets <file_globs>                  Filter the targets that are analyzed and repaired
-e, --errors                                List the files that contain broken references to other files and prompt you to fix them
-s, --show-sources                          List the files (sources of references) that contain references to other files
-t, --show-targets                          List the files (targets of references) that are referenced by other files
-u, --unprompted                            Don't prompt to fix broken references, just fix them (unless -r)
-r, --read-only                             Don't fix broken references
```

## Examples

`depdoc -ret -f 'test' -S '!*Test.js,!*Spec.js` Don't repair files, list errors and all references (targets), and filter out test files and directories.

## Configuration

You can also specify filtering and parsing options by creating a `.depdocrc` file. Place it in your `$home` or `/etc` directory, or specify its path using the command-line option `-c|--config`. The file will be merged into the following default settings and should use the same JSON format.

```javascript
{
  "default": {
    "workingDir": "{{CWD}}",
    "directoryFilter": [
      ".*",
      "node_modules",
      "build"
    ],
    "referencingFileFilter": [
      "*.js",
      "*.jsx"
    ],
    "referencedFileFilter": [
      "*.js",
      "*.jsx",
      "*.json"
    ],
    "searchPatterns": [
      "(^|\\s)import +([\\w\\-\\{\\}\\, \\*\\$]+ )?(['\"]){{valuePattern}}\\3",
      "(^|[^\\w-])require *\\( *(['\"]){{valuePattern}}\\2 *\\)"
    ],
    "valuePattern": "\\.+/[^'\"\\s]+",
    "excludeText": [
      "// *[^\\n]+\\n",
      "/\\*[\\s\\S]+?\\*/"
    ]
  },
  "html": {
    "referencingFileFilter": [
      "*.html"
    ],
    "referencedFileFilter": [
      "*.*"
    ],
    "searchPatterns": [
      "<link +[^>]*href=(['\"]){{valuePattern}}\\1[^>]*>",
      "<a +[^>]*href=(['\"]){{valuePattern}}\\1[^>]*>",
      "<script +[^>]*src=(['\"]){{valuePattern}}\\1[^>]*>",
      "<img +[^>]*src=(['\"]){{valuePattern}}\\1[^>]*>"
    ],
    "valuePattern": "[^'\"\\s:;#]+"
  }
}
```

You can add as many modes as you want and select them from the command line using the `-m` switch. Each new mode will be merged with `default`, so you need only include the properties you wish to overrride. For example, adding the following to a `.depdocrc` file will exclude all `test` and `qa` directories from parsing, and it will allow you to use the command-line option `-m myMode` to search for only `*.jsx` files that reference `*.js` files.

```javascript
{
  "default": {
    "directoryFilter": [
      ".*",
      "node_modules",
      "build",
      "test",
      "qa"
    ],
  },
  "myMode": {
    "referencingFileFilter": [
      "*.jsx"
    ],
    "referencedFileFilter": [
      "*.js"
    ],
    "searchPatterns": [
      "<link +[^>]*href=(['\"]){{valuePattern}}\\1[^>]*>",
      "<a +[^>]*href=(['\"]){{valuePattern}}\\1[^>]*>",
      "<script +[^>]*src=(['\"]){{valuePattern}}\\1[^>]*>",
      "<img +[^>]*src=(['\"]){{valuePattern}}\\1[^>]*>"
    ],
    "valuePattern": "[^'\"\\s:;#]+"
  }
}
```
Modify `searchPatterns` and `valuePattern` to change the types of references that are parsed and repaired.
