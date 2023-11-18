// function postProcess(output) {
//     for(let key in output) {
//         if(output[key].score < 3) delete output[key];
//     }

//     let keys = Object.keys(output).sort(sortKeys);
//     output.__keys = keys;
//     let deleteKeys = [];
//     let happyToDelete = true;
//     let answer;

//     console.log(`Identified ${keys.length} keys.`);
//     console.log("Enter a comma-separated list of numbers, and/or range, identifying the keys you want to delete: (eg: 1,4,6-9)")
//     const PAGE_SIZE = 30;
//     do {
//         deleteKeys = [];
//         happyToDelete = true;
//         for(let paginate = 0; paginate < keys.length; paginate += PAGE_SIZE) {
//             for(let k = paginate; k < paginate + PAGE_SIZE; k++) console.log(`[${`${k}`.padStart(3, " ")}]: ${keys[k]}`);
//             console.log();
//             answer = rl.question("Choices: ");
//             deleteKeys.push(answer.split(",").filter((s) => s.length > 0).map((s) => ["all", "*"].includes(s) ? genNums(`${paginate}-${paginate + 9}`) : s.includes("-") ? genNums(s) : parseInt(s)));
//         }

//         // show list of keys to be deleted and ask if okasy with that
//         console.log("Here are the keys you want to delete: ");
//         console.log("  " + deleteKeys.map((i) => keys[i]).join(", "));
//         happyToDelete = rl.keyInYNStrict("Are you happy with this? ");
//     } while(!happyToDelete)

//     // Sort them, but iterate backwards so we don't hit any weird missing key thingos
//     deleteKeys = deleteKeys.sort();
//     for(let i = deleteKeys.length - 1; i >= 0; i--) delete output[keys[deleteKeys[i]]];

//     keys = Object.keys(output).filter(k => k !== "__keys");
//     output.__keys = keys;

//     return output;
// }

/**
 * @param {string} bounds 
 */
function genNums(bounds) {
    bounds = bounds.split("-").map(q => parseInt(q));
    return [...Array((bounds[1] + 1) - bounds[0]).keys()].map(x => x + bounds[0]);
}
