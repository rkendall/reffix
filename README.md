
# refix

**Reference Fixer** -- the easy fix for your broken references. Analyze and batch repair broken references across an entire project. [Prerelease]

## Features

- Fixes broken `require` and `import` statements in JavaScript files
- Fixes broken `src` and `href` attributes in HTML files
- Fully cusomizable to support references in any other types of files
- Expands references you type into your files
- Generates comprehensive reports about all the dependencies in a project
- Comprehensive filtering options
- Extremely fast asynchronous performance

## Install

Clone the project, then from the project's root directory run  
`npm install --global`

## Command Line Usage

By default, refix will generate a report of broken module references (`require` and `import` statements) by recursing through all the `.js`, `.jsx`, and `.json` files in the directory in which it is launched. It will then list the broken and corrected paths and prompt you to update the files to fix them. Type `y` or just hit `Enter` to make the repairs. All reports list absolute paths, but relative paths will be used to update the files.

![Command line output](img/example1.png)

The program can repair only references broken as a result of files being moved. It cannot yet handle references broken as a result of files being renamed. If a broken reference refers to a filename that is shared by mutliple files in different locations, refix will prompt you to select the correct filepath to use for the corrected reference.

![Prompt to choose file](img/example2.png)

 Using the command-line options described below, you can generate reports showing which files contain references and which files they refer to. You can filter the searches via command line options or configuration settings in a `.refixrc` configuration file.
 
## Tip
 
Use `refix` to automatically expand references you type into files. If you don't know the full path of a referenced file, type in `'./nameOfYourFile.js`, run `refix` to update the file and replace `./` with the correct path, then reload the file in your editor.

## Command Line Options

### General Usage

`refix [options] [working_directory]`

Each option has an abbreviated (`-o`) and a full (`--option`) version that can be used interchangeably. `working_directory` is the starting path to use for parsing files. It defaults to the directory from which the command is executed.

### Error Correction

- `-e --errors` - List broken references and files containing them. This option is engaged by default if none of the reporting options below are engaged.
- `-m default` or `--mode default` - Fix `import` and `require` statements in JavaScript files. This is the default mode if `-m` is omitted.  
- `-m html` or `--mode html` - Fix broken `href` and `src` attributes in HTML files.  
- `-n --no-prompts` - Fix errors without prompting (unless overridden by `-r`).
- `-r --report-only` - Don't fix errors, just show the report. (Overrides `-p`.)

### Filtering

All lists of globs, as described below, must be separated by commas or spaces and enclosed in quotes.

- `-d --dir <directory_globs>` - Specify a list of directory names or globs to exclude from parsing. The names are added to the default list of `'.*,node_modules,build'`.
- `-f --files <source_globs> [target_globs]` - Specify a glob or list of globs to filter the source (referencing) and target (referenced) files that are analyzed and repaired. For example, `'!*Spec.js,*.js'`. Overrides the default filter, which is `'*.js,*.jsx' '*.js,*.jsx,*.json'`. `source_globs` is required. If you wish to filter only target files, enter `''` for `source_globs`.

### Reporting

- `-s --sources` - List files that contain (are sources of) references.
- `-t --targets` - List files that are referenced (targets of references) by other files.

### Help

- `-h --help` - Produces the following display.
```
-h, --help                                 output usage information
-V, --version                              output the version number
-c, --config [filepath]                    path of custom configuration file
-m, --mode <default|html>                  type of references to look for, JS import/require (default) or HTML href/src (html)
-f, --files <source_globs> [target_globs]  filter the source (referencing) and target (referenced) files parsed (e.g., '*1.js,*2.js' 'file.js'
-d, --dirs <directory_globs>               exclude from sources the specified directories (e.g., 'test,bin')
-e, --errors                               list broken references and prompt to fix them
-s, --sources                              list files (sources of references) containing references to other files
-t, --targets                              list files (targets of references) referenced by other files
-n, --no-prompts                           fix broken references without prompting (unless -r)
-r, --report-only                          don't fix broken references, just display reports
```

## Examples

`refix`
List all broken references and prompt you to fix them.

`refix -ret -d 'test' -f '!*Test.js,!*Spec.js'`  
Don't repair files, list errors and all references (targets), and filter out test files and directories.

`refix -u -f '' '**/examples/*Widget.*,**/examples/*Module.*'`
Repair files without prompting. Fix only references to widgets and modules in `examples` directory. 

## Customization

### Configuration File

You can also specify filtering and parsing options by creating a `.refixrc` file. Place it in your `$home` or `/etc` directory, or specify its path using the command-line option `-c|--config`. The file will be merged into the following default settings and should use the same JSON format.

```javascript
{
  "default": {
    "workingDir": ".",
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

You can add as many modes as you want and select them from the command line using the `-m` switch. Each new mode will be merged with `default`, so you need only include the properties you wish to overrride. For example, adding the following to a `.refixrc` file will exclude all `test` and `qa` directories from parsing, and it will allow you to use the command-line option `-m myMode` to search for only `*.jsx` files that reference `*.js` files.

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
