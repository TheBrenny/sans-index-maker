const fs = require('fs');
const path = require('path');

// Get the folder path from the command line arguments
const folderPath = process.argv[2];
const fileEnding = process.argv[3];

if(!folderPath || !fileEnding) {
    console.error('Usage: node combiner.js <folder path> <file ending>');
    process.exit(1);
}

function sortPages(a, b) {
    return parseInt(a) - parseInt(b);
}

// Function to read and combine JSON files
function combineFiles(folderPath) {
    const files = fs.readdirSync(folderPath);

    const combinedData = new Map();

    files.forEach(file => {
        if(file.endsWith(fileEnding)) {
            const filePath = path.join(folderPath, file);
            /** @type {Object.<string, {name:string, score:number, pages:Set<number>}>} */
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // Combine data based on matching keys
            for(let k in fileData) {
                if(k === "__keys") {
                    if(!combinedData.has("__keys")) combinedData.set("__keys", new Set());
                    let s = combinedData.get("__keys");
                    Array.from(fileData[k]).forEach(kk => s.add(kk));
                    continue;
                }

                if(!combinedData.has(k)) {
                    combinedData.set(k, {
                        name: fileData[k].name,
                        score: 0,
                        pages: {},
                    });
                }

                combinedData.get(k).score += fileData[k].score;
                combinedData.get(k).pages[file] = Array.from(fileData[k].pages).sort(sortPages);
            }
        }
    });
    combinedData.set("__keys", Array.from(combinedData.get("__keys")));

    let sortedData = Array.from(combinedData.entries()).sort((a, b) => {
        if(a[0] === "__keys" && b[0] === "__keys") return 0;
        if(a[0] === "__keys" && b[0] !== "__keys") return 1;
        if(a[0] !== "__keys" && b[0] === "__keys") return -1;

        return a[1].name.localeCompare(b[1].name, undefined, {sensitivity: 'base'});
    });
    let combinedSortedData = Object.fromEntries(sortedData);

    return combinedSortedData;
}

// Usage
const result = combineFiles(folderPath);
fs.writeFileSync(path.join(folderPath, "output.json"), JSON.stringify(result, null, 2));



const outType = {
    "keyName": {
        name: "string of real full name",
        score: "number of total score",
        pages: {
            "filename": ["array of page numbers sorted"]
        }
    }
}