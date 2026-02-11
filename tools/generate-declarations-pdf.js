#!/usr/bin/env node

const fs = require('fs');
const puppeteer = require('puppeteer');
const { marked } = require('marked');

async function generatePDF() {
  console.log('📄 Generating Daily Declarations PDF...');
  
  const mdContent = fs.readFileSync('./personal/DAILY-DECLARATIONS.md', 'utf-8');
  const htmlBody = marked.parse(mdContent);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        
        * { box-sizing: border-box; }
        
        body {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 13pt;
            line-height: 1.8;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
        }
        
        h1 {
            font-size: 32pt;
            font-weight: 700;
            text-align: center;
            color: #1a1a1a;
            margin-bottom: 5px;
            letter-spacing: 2px;
        }
        
        h2 {
            font-size: 14pt;
            font-weight: 600;
            text-align: center;
            color: #666;
            margin-top: 0;
            margin-bottom: 30px;
            font-family: 'Inter', sans-serif;
            letter-spacing: 3px;
            text-transform: uppercase;
        }
        
        h2:nth-of-type(3) {
            page-break-before: always;
            margin-top: 0;
            padding-top: 0;
        }
        
        h2:not(:first-of-type):not(:nth-of-type(2)) {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
        
        h3 {
            font-size: 11pt;
            font-weight: 600;
            color: #333;
            font-family: 'Inter', sans-serif;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 25px;
        }
        
        p {
            margin: 15px 0;
            text-align: justify;
        }
        
        strong {
            color: #0b63c5;
            font-weight: 600;
        }
        
        em {
            font-style: italic;
            color: #444;
        }
        
        hr {
            border: none;
            height: 1px;
            background: linear-gradient(90deg, transparent, #ccc, transparent);
            margin: 30px 0;
        }
        
        blockquote {
            font-style: italic;
            text-align: center;
            border: none;
            margin: 30px 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            color: #444;
        }
        
        ol, ul {
            margin: 15px 0;
            padding-left: 25px;
        }
        
        li {
            margin: 8px 0;
            font-family: 'Inter', sans-serif;
            font-size: 11pt;
        }
    </style>
</head>
<body>
    ${htmlBody}
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: './personal/DAILY-DECLARATIONS.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
  });

  await browser.close();
  console.log('✅ PDF generated: personal/DAILY-DECLARATIONS.pdf');
}

generatePDF().catch(console.error);
