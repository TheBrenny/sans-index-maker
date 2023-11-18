# sans-index-maker
> Works on my machine™️

Pass a combined PDF book and password and generate an index of all occurences of words in the book!

Run this PS command to run for all books - change the course name as required or leave it out. *Don't include SANS in the course name!!*
```powershell
$bookPath = "path\to\your\books"
ls "$bookPath\*.pdf" | %{ node .\index.js "$_" "book password here" "SEC123 Course Title: Another One Down, Four More To Go" }
node .\combiner.js "$bookPath\" ".step3.json"
node .\prettify.js "$bookPath\output.json" "$bookPath\output.txt"
```

## It's not working

Use PNPM, apply the patch otherwise figure it out from the [patchfile here](patches/pdf-parse-pages@1.1.3.patch).