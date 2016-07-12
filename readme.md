
# dep-doc

The **Dependency Doctor** for analyzing and fixing broken links, references, and dependencies in any type of files.

## Features

- Fixes broken `require` and `import` statements in JavaScript files
- Fixes broken `src` and `href` attributes in HTML files
- Fully cusomizable to support references in any other types of files
- Run it from the command line or use it in JavaScript projects
- Generates comprehensive reports about all the dependencies in a project
- Comprehensive filtering options

## Install

```
// Install to run from the command line
npm install --global dep-doc

// Install as a module
npm install --save dep-doc
```

## Command Line Usage

By default, dep-doc will generate a report of broken module references by recursing through the directory in which it is launched. It will then list the broken and corrected paths and prompt you to fix them. All reports list absolute paths, but relative paths will be used to update the files.

![Command line output](file:///Users/robertkendall/code/dependency-doctor/img/example1.png)

The program can repair only references broken as a result of files being moved. It cannot yet handle references broken as a result of files being renamed. If a broken reference refers to a filename that is shared by mutliple files in different locations, dep-doc will prompt you to select the correct filepath to use for the corrected reference.

 \<screenshot here>

## Command Line Options

