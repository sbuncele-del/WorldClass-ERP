#!/usr/bin/env node

/**
 * SiyaBusa ERP - Use of Funds PDF Generator
 * Creates a beautiful investor-ready PDF with cover page
 */

const fs = require('fs');
const puppeteer = require('puppeteer');
const { marked } = require('marked');

async function generateUseOfFundsPDF() {
  console.log('📄 Generating Use of Funds PDF...');
  
  const mdContent = fs.readFileSync('./investor-docs/USE-OF-FUNDS-R30K.md', 'utf-8');
  const htmlBody = marked.parse(mdContent);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        
        * { box-sizing: border-box; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1e2a3a;
            margin: 0;
            padding: 0;
        }
        
        /* Cover Page - Professional blue gradient */
        .cover-page {
            height: 250mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #020617 0%, #0b63c5 50%, #084a96 100%);
            margin: -20mm -20mm 0 -20mm;
            padding: 20mm;
            page-break-after: always;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        /* Subtle grid overlay */
        .cover-page::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
            background-size: 50px 50px;
        }
        
        /* Frosted glass content box */
        .cover-content {
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(12px);
            padding: 60px 80px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            max-width: 85%;
            position: relative;
            z-index: 10;
        }
        
        .cover-logo { font-size: 42px; font-weight: 800; color: #ffffff; margin-bottom: 15px; letter-spacing: -1px; }
        .cover-title { font-size: 28px; font-weight: 600; color: #ffffff; margin-bottom: 10px; }
        .cover-subtitle { font-size: 16px; font-weight: 400; color: #bfdbfe; margin-bottom: 25px; }
        .cover-amount { font-size: 52px; font-weight: 800; color: #ffffff; margin: 25px 0; letter-spacing: -2px; }
        .cover-company { font-size: 14px; font-weight: 500; color: #93c5fd; margin-top: 30px; letter-spacing: 1px; }
        
        .cover-info {
            margin-top: 30px;
            padding: 25px 35px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            text-align: left;
            display: inline-block;
        }
        
        .cover-info .info-row { margin: 10px 0; font-size: 14px; color: #e0f2fe; }
        .cover-info .info-label { font-weight: 600; color: #93c5fd; min-width: 140px; display: inline-block; }
        .cover-info .info-value { color: #ffffff; }
        
        .cover-date {
            margin-top: 35px;
            font-size: 13px;
            color: #64748b;
            letter-spacing: 1px;
        }
        
        /* Content Styles - 3 colors only: Blue (#0b63c5), Dark (#1e2a3a), Light gray (#f8fafc) */
        h1 {
            color: #0b63c5;
            border-bottom: 3px solid #0b63c5;
            padding-bottom: 12px;
            margin-top: 40px;
            font-size: 24px;
            font-weight: 700;
        }
        
        h2 {
            color: #1e2a3a;
            border-bottom: 2px solid #0b63c5;
            padding-bottom: 10px;
            margin-top: 25px;
            font-size: 18px;
            font-weight: 700;
        }
        
        h3 {
            color: #0b63c5;
            margin-top: 25px;
            font-size: 16px;
            font-weight: 700;
        }
        
        p { margin: 12px 0; text-align: justify; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 11px;
        }
        
        th {
            background: #0b63c5;
            color: white;
            font-weight: 600;
            padding: 12px 15px;
            text-align: left;
        }
        
        td {
            border: 1px solid #e2e8f0;
            padding: 10px 15px;
        }
        
        tr:nth-child(even) { background-color: #f8fafc; }
        
        code {
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            color: #0b63c5;
        }
        
        pre {
            background-color: #1e2a3a;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            font-size: 11px;
            border-left: 4px solid #0b63c5;
        }
        
        blockquote {
            border-left: 5px solid #0b63c5;
            margin: 20px 0;
            padding: 15px 20px;
            background: #f8fafc;
            border-radius: 0 8px 8px 0;
            font-style: normal;
        }
        
        hr {
            border: none;
            height: 2px;
            background: #0b63c5;
            margin: 35px 0;
        }
        
        strong { color: #1e2a3a; font-weight: 600; }
        
        ul, ol { margin: 15px 0; padding-left: 30px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="cover-page">
        <div class="cover-content">
            <div class="cover-logo">SiyaBusa ERP</div>
            <div class="cover-title">Use of Funds</div>
            <div class="cover-subtitle">Seed Investment Proposal</div>
            <div class="cover-amount">R30,000</div>
            <div class="cover-subtitle">SAFE Agreement · R2,000,000 Valuation Cap</div>
            
            <div class="cover-info">
                <div class="info-row">
                    <span class="info-label">Investment Period:</span>
                    <span class="info-value">February – April 2026</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Instrument:</span>
                    <span class="info-value">SAFE (Post-Money)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Valuation Cap:</span>
                    <span class="info-value">R2,000,000</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Target Milestone:</span>
                    <span class="info-value">First Paying Customer · March 2026</span>
                </div>
            </div>
            
            <div class="cover-company">MASAPHOKATI TECHNOLOGIES (PTY) LTD</div>
            <div class="cover-date">February 2026 · Confidential</div>
        </div>
    </div>
    
    <div class="content">
        ${htmlBody}
    </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: './investor-docs/USE-OF-FUNDS-R30K.pdf',
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="font-size: 9px; color: #9ca3af; width: 100%; text-align: center; padding-bottom: 10px; font-family: sans-serif;">
      <span>Masaphokati Technologies (Pty) Ltd - Confidential</span>
      <span style="margin-left: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
    margin: { top: '20mm', right: '20mm', bottom: '25mm', left: '20mm' }
  });

  await browser.close();
  console.log('✅ PDF generated: investor-docs/USE-OF-FUNDS-R30K.pdf');
}

generateUseOfFundsPDF().catch(console.error);
