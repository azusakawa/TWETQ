const fs = require('fs');

const path = 'src/worker.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix batch 1 annotation bug: 'str' -> 'string', 'int' -> 'number'
content = content.replace(/: str\)/g, ': string)');
content = content.replace(/: int\)/g, ': number)');

// Also fix str and int as standalone (not in type annotations)
content = content.replace(/(?<![a-zA-Z_:])str(?![a-zA-Z_:])/g, 'str');
content = content.replace(/(?<![a-zA-Z_:])int(?![a-zA-Z_:])/g, 'int');

// Fix remaining `str` and `int` references that are used as function arguments
// These are string/number literals passed to functions
content = content.replace(/str(?!\w)/g, '"str"');
content = content.replace(/int(?!\w)/g, '"int"');

// Actually, let me look at what str/int refer to
// They seem to be passed as string/number values to functions

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed str/int references');
