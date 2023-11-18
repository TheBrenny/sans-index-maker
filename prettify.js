const fs = require('fs');

const inFile = process.argv[2];
const outFile = process.argv[3]

if(!inFile || !outFile) {
    console.error("Usage: node prettify.js <input file> <output file>");
    process.exit(1);
}

/** @type {Object.<string, {name:string, score:number, pages:Object.<string, number[]>}>} */
const data = JSON.parse(fs.readFileSync(inFile));

let output = "";

// Combine data based on matching keys
for(let k in data) {
    if(k === "__keys") continue;
    output += `${data[k].name}\n`;
    for(let b in data[k].pages) output += `${b}\n${data[k].pages[b].join(", ")}\n`;
    output += "\n";
}

fs.writeFileSync(outFile, output);