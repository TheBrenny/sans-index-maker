const fs = require('fs');
const PDFParser = require('pdf-parse-pages');
const natural = require('natural');
const rl = require("readline-sync");

// Set up the natural language toolkit
const tokenizer = new natural.WordTokenizer();
const stopwords = natural.stopwords;
const bannedWords = fs.readFileSync("./bannedWords.txt").toString().toLowerCase().split(/\r?\n/g);
const coursename = (process.argv[4] ?? "").toLocaleLowerCase().replace(/[^\w\s]/g, "").split(" ").join(" ");

/**
 * Function used to determine the order of the elements. It is expected to return a
 * negative value if the first argument is less than the second argument, zero if
 * they're equal, and a positive value otherwise. If omitted, the elements are sorted
 * in ascending, ASCII character order.
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
function sortKeys(a, b) {
    return a.localeCompare(b, undefined, {sensitivity: 'base'});
}
function sortPages(a, b) {
    return parseInt(a) - parseInt(b);
}

function containsBannedWord(word) {
    word = '"' + word.toLowerCase() + '"';
    return bannedWords.some((b) => word.includes(b));
}

/** @returns {string[]} */
function filterNonIndexWords(words) {
    words = words.filter((word) => {
        // filter boring words out
        if(stopwords.includes(word.toLowerCase())) return false;
        // filter digits out
        if(/^\d+$/g.test(word)) return false;
        // filter if it's purely lowercase;
        if(word === word.toLowerCase()) return false;

        return true;
    })

    return words;
}
function filterBadWordgroups(wordGroups) {
    return wordGroups.filter((wg) => {
        // filter if it's part of the banned list
        if(containsBannedWord(wg)) return false;
        // filter if it is just a repeated version of itself
        if(wg.split(" ").length > 1 && wg.split(" ").some((v, i, a) => a.indexOf(v) !== i)) return false;

        return true;
    });
}

// Function to process a chunk of text
/** @returns {string[]} */
function processText(text) {
    // Delete the course name when we read the text
    const words = tokenizer.tokenize(text).join(" ").replace(new RegExp(coursename, "gi"), "").split(" ");
    const filteredWords = filterNonIndexWords(words);
    return filteredWords;
}

// Function to process the extracted text from the PDF
function processPdfPage(pdfPageText) {
    const wordGroups = [];
    const words = processText(pdfPageText);

    // Loop through every word, and if collect 1,2,3-grams
    for(let i = 0; i < words.length; i++) {
        wordGroups.push(words[i]);
        if(i - 1 >= 0) wordGroups.push([words[i - 1], words[i]].join(" "));
        if(i - 2 >= 0) wordGroups.push([words[i - 2], words[i - 1], words[i]].join(" "));
    }

    return filterBadWordgroups(wordGroups);
}

/**
 * @param {string[]} wordGroups
 * @param {Map.<string, {name:string, score:number, pages:Set<number>}>} data 
 * @returns {Map.<string, {name:string, score:number, pages:Set<number>}>} data 
 */
function scoreAndSaveWordGroups(wordGroups, data, page) {
    for(let wordGroup of wordGroups) {
        let wgLower = wordGroup.toLocaleLowerCase();
        if(!data.has(wgLower)) {
            data.set(wgLower, {
                name: wordGroup,
                score: 0,
                pages: new Set(),
            });
        }

        data.get(wgLower).score += 1;
        data.get(wgLower).pages.add(page);
    }
}

// Read and parse the PDF
async function readPdf(filePath, password) {
    const dataBuffer = fs.readFileSync(filePath);

    return PDFParser(dataBuffer, {password: (resolve) => resolve(password)})
        .then(data => {
            /** @type {Map.<string, {name:string, score:number, pages:Set<number>}>} */
            let output = new Map();

            for(let pageNum = 0; pageNum <= data.pages.length; pageNum++) {
                if(typeof data.pages[pageNum] !== 'string') continue;
                let text = data.pages[pageNum];
                let wordGroups = processPdfPage(text);
                scoreAndSaveWordGroups(wordGroups, output, pageNum);
            }

            // convert the set to an array
            for(let wg of output.keys()) output.get(wg).pages = Array.from(output.get(wg).pages).sort(sortPages);
            let keys = Array.from(output.keys()).sort(sortKeys);
            output.set("__keys", keys);

            return output;
        }).catch(error => console.error(error));
}

/**
 * @param {string} path 
 * @param {Map.<string, {name:string, score:number, pages:Set<number>}>} output 
 * @returns {Map.<string, {name:string, score:number, pages:Set<number>}>}
 */
function deleteSomeKeys(path, output) {
    let keysToKeep = JSON.parse(fs.readFileSync(path));
    for(let k of output.keys()) if(!keysToKeep.includes(k)) output.delete(k);
    output.set("__keys", keysToKeep);
    return output;
}

/**
 * @param {string} path 
 * @param {Map.<string, {name:string, score:number, pages:Set<number>}>} output 
 * @returns {Map.<string, {name:string, score:number, pages:Set<number>}>}
 */
function dedupeWordGroups(output) {
    let keys = output.get("__keys");

    // loop through all keys that start with us and if we find an exact match of our pages, then delete me
    // we prefer superKs here. (the bigger the better)
    let shouldBreak = false;
    for(let k of keys) {
        if(k === "__keys") continue;
        shouldBreak = false;
        for(let superK of keys) {
            if(shouldBreak) break;

            if(superK === "__keys") continue;
            if(k === superK) continue;
            if(!superK.startsWith(`${k} `)) continue;
            if(output.get(k) === undefined) continue;
            if(output.get(superK) === undefined) continue;

            let kPages = output.get(k).pages.sort(sortPages);
            let superPages = output.get(superK).pages.sort(sortPages);

            if(JSON.stringify(kPages) === JSON.stringify(superPages)) {
                shouldBreak = true;
                output.delete(k);
            } else if(Math.abs(kPages.length - superPages.length) <= 2) {
                let droppedOne = kPages.length < superPages.length ? k : superK; // this selects the shorter one
                if(droppedOne === k) shouldBreak = true;
                output.delete(droppedOne);
            }
        }
    }

    output.set("__keys", Array.from(output.keys()).sort(sortKeys));

    return output;
}


function saveKeys(path) {
    return (output) => {
        fs.writeFileSync(path, JSON.stringify(output.get("__keys").filter(k => output.get(k).score >= 3)));
        return output;
    }
}
function saveData(path) {
    return (output) => {
        fs.writeFileSync(path, JSON.stringify(Object.fromEntries(output)));
        return output;
    }
}

// Example usage
const pdfFilePath = process.argv[2];
const password = process.argv[3];
readPdf(pdfFilePath, password)
    .then(saveKeys(`${pdfFilePath}.step1.json`))
    // .then(postProcess)
    .then((output) => {
        rl.keyInPause(`Go and review the "${pdfFilePath}.step1.json" file and remove the keys you want to delete. `);
        return deleteSomeKeys(`${pdfFilePath}.step1.json`, output);
    })
    .then(saveData(`${pdfFilePath}.step2.json`))
    .then(dedupeWordGroups)
    .then(saveData(`${pdfFilePath}.step3.json`))
    ;
