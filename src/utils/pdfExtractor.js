import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

async function extractPageWiseText(pdfBuffer)
{
    const loadingTask = pdfjsLib.getDocument({data:pdfBuffer});
    const pdfDocument = await loadingTask.promise;
    const totalPages = pdfDocument.numPages;

    const pagesText = []

    for(let pageNum = 1;pageNum <= totalPages ; pageNum++)
    {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item=>item.str).join(' ');
        pagesText.push({
            pageNumber:pageNum,
            content:pageText
        })
    }

    return {totalPages,pagesText}
}

export {extractPageWiseText};