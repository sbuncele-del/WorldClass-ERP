#!/usr/bin/env node

/**
 * WorldClass ERP - Professional PDF Documentation Generator
 * Converts markdown documentation to investor-ready PDFs using Puppeteer
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { marked } = require('marked');

// Key documents organized by category - Updated Jan 2, 2026
const DOCUMENT_CATEGORIES = {
  'Executive-Summary': [
    'STATUS-UPDATE-DEC30-2025.md',
    'PRODUCTION-READINESS-ASSESSMENT.md',
    'BACKEND_API_COMPLETE.md'
  ],
  'Launch-Plan': [
    'docs/ACTION-PLAN-AND-CHECKLIST.md'
  ],
  'Technical-Implementation': [
    'AWS-DEPLOYMENT-STATUS.md',
    'FRONTEND-BACKEND-INTEGRATION.md',
    'DATABASE-MIGRATION-SUCCESS.md'
  ],
  'Business-Modules': [
    'CASH-MANAGEMENT-COMPLETE.md',
    'COMPLIANCE-MODULE-COMPLETE.md',
    'ASSET-MANAGEMENT-COMPLETE-WORKING.md'
  ],
  'AI-Capabilities': [
    'AI-ASSISTANT-ENHANCEMENT.md',
    'AI-AGENTS-QUICK-START.md'
  ]
};

// Professional HTML template with styling
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        @page {
            size: A4;
            margin: 25mm 20mm 25mm 20mm;
        }
        
        body {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 100%;
            margin: 0;
            padding: 0;
        }
        
        .cover-page {
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%);
            color: white;
            text-align: center;
            padding: 60px 40px;
            box-sizing: border-box;
        }
        
        .cover-logo {
            font-size: 52px;
            font-weight: bold;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            letter-spacing: 2px;
        }
        
        .cover-subtitle {
            font-size: 22px;
            margin-bottom: 50px;
            opacity: 0.95;
            font-weight: 300;
        }
        
        .cover-category {
            font-size: 36px;
            font-weight: 600;
            margin: 40px 0;
            padding: 20px 40px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .cover-badges {
            display: flex;
            gap: 15px;
            margin: 30px 0;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .badge {
            background: rgba(255,255,255,0.2);
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            backdrop-filter: blur(5px);
        }
        
        .cover-date {
            margin-top: 40px;
            font-size: 14px;
            opacity: 0.8;
        }
        
        .toc-page {
            page-break-after: always;
            padding: 40px 0;
        }
        
        .toc-title {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 30px;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 15px;
        }
        
        .toc-list {
            list-style: none;
            padding: 0;
        }
        
        .toc-item {
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        
        .toc-number {
            color: #0ea5e9;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .content-section {
            page-break-before: always;
            padding: 20px 0;
        }
        
        h1 {
            color: #1e40af;
            font-size: 26px;
            font-weight: 700;
            margin: 40px 0 20px 0;
            padding-bottom: 12px;
            border-bottom: 3px solid #0ea5e9;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        
        h2 {
            color: #1e40af;
            font-size: 20px;
            font-weight: 600;
            margin: 30px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        
        h3 {
            color: #334155;
            font-size: 17px;
            font-weight: 600;
            margin: 25px 0 12px 0;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        
        h4 {
            color: #475569;
            font-size: 15px;
            font-weight: 600;
            margin: 20px 0 10px 0;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        
        p {
            margin: 12px 0;
            text-align: justify;
            orphans: 3;
            widows: 3;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
            page-break-inside: avoid;
        }
        
        li {
            margin: 8px 0;
            page-break-inside: avoid;
        }
        
        code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #dc2626;
        }
        
        pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            border-left: 4px solid #0ea5e9;
            page-break-inside: avoid;
        }
        
        pre code {
            background: none;
            color: inherit;
            padding: 0;
        }
        
        blockquote {
            border-left: 4px solid #0ea5e9;
            margin: 20px 0;
            padding: 15px 20px;
            background: #f8fafc;
            font-style: italic;
            color: #475569;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
            page-break-inside: avoid;
        }
        
        th {
            background: #1e40af;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
        }
        
        tr:nth-child(even) {
            background: #f8fafc;
        }
        
        .header-footer {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-top: 1px solid #e2e8f0;
            margin-top: 30px;
            font-size: 10px;
            color: #64748b;
        }
        
        .page-header {
            position: running(header);
            text-align: center;
            font-size: 10px;
            color: #64748b;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .page-footer {
            position: running(footer);
            text-align: center;
            font-size: 10px;
            color: #64748b;
            padding: 10px 0;
            border-top: 1px solid #e2e8f0;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin: 5px 5px 5px 0;
        }
        
        .status-complete {
            background: #dcfce7;
            color: #166534;
        }
        
        .status-progress {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-planned {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .highlight-box {
            background: #f0f9ff;
            border: 2px solid #0ea5e9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .warning-box {
            background: #fef3c7;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .success-box {
            background: #dcfce7;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        a {
            color: #0ea5e9;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    {{CONTENT}}
</body>
</html>
`;

class InvestorPDFGenerator {
  constructor(outputDir = './investor-docs') {
    this.outputDir = outputDir;
    this.rootDir = '/workspaces/WorldClass-ERP';
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  generateCoverPage(category) {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="cover-page">
        <div class="cover-logo">SiyaBusa ERP</div>
        <div class="cover-subtitle">Enterprise Resource Planning System</div>
        <div class="cover-category">${category.replace(/-/g, ' ')}</div>
        <div class="cover-badges">
          <span class="badge">✓ Production Ready</span>
          <span class="badge">✓ 25+ Modules</span>
          <span class="badge">✓ AWS Deployed</span>
          <span class="badge">✓ 400+ APIs</span>
          <span class="badge">✓ Multi-Tenant</span>
          <span class="badge">✓ AI-Powered</span>
        </div>
        <div class="cover-date">Generated: ${date}</div>
        <div class="cover-date" style="margin-top: 20px; font-size: 12px;">
          Confidential & Proprietary
        </div>
      </div>
    `;
  }

  generateTableOfContents(files) {
    const items = files.map((file, i) => {
      const title = file.replace('.md', '').replace(/-/g, ' ');
      return `<li class="toc-item"><span class="toc-number">${i + 1}.</span> ${title}</li>`;
    }).join('');

    return `
      <div class="toc-page">
        <h1 class="toc-title">Table of Contents</h1>
        <ul class="toc-list">
          ${items}
        </ul>
      </div>
    `;
  }

  processMarkdown(content) {
    // Pre-process content to fix [object Object] issues
    content = content.replace(/\[object Object\]/g, '');
    
    // Configure marked for better rendering
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false,
      sanitize: false
    });

    // Custom renderer for checkboxes and better formatting
    const renderer = new marked.Renderer();
    
    renderer.listitem = function(text) {
      // Handle checkboxes
      if (/^\[x\]\s/.test(text)) {
        return '<li style="list-style: none; margin-left: -20px;">✅ ' + text.replace(/^\[x\]\s/, '') + '</li>';
      } else if (/^\[ \]\s/.test(text)) {
        return '<li style="list-style: none; margin-left: -20px;">⬜ ' + text.replace(/^\[ \]\s/, '') + '</li>';
      }
      
      // Clean up any remaining object references
      text = String(text).replace(/\[object Object\]/g, '');
      
      return '<li>' + text + '</li>';
    };
    
    // Override paragraph to clean content
    const originalParagraph = renderer.paragraph;
    renderer.paragraph = function(text) {
      text = String(text).replace(/\[object Object\]/g, '');
      return originalParagraph.call(this, text);
    };

    marked.setOptions({ renderer });

    return marked.parse(content);
  }

  async generatePDF(category, files) {
    console.log(`\n📄 Generating: ${category}`);
    
    let htmlContent = this.generateCoverPage(category);
    htmlContent += this.generateTableOfContents(files);

    // Process each file
    for (const file of files) {
      const filePath = path.join(this.rootDir, file);
      
      if (fs.existsSync(filePath)) {
        console.log(`   ✓ Processing ${file}`);
        const markdown = fs.readFileSync(filePath, 'utf-8');
        const html = this.processMarkdown(markdown);
        const title = file.replace('.md', '').replace(/-/g, ' ');
        
        htmlContent += `
          <div class="content-section">
            <h1>${title}</h1>
            ${html}
          </div>
        `;
      } else {
        console.log(`   ⚠️  File not found: ${file}`);
      }
    }

    // Generate final HTML
    const finalHTML = HTML_TEMPLATE
      .replace(/{{TITLE}}/g, `SiyaBusa ERP - ${category.replace(/-/g, ' ')}`)
      .replace(/{{CATEGORY}}/g, category.replace(/-/g, ' '))
      .replace('{{CONTENT}}', htmlContent);

    // Save HTML for debugging
    const htmlPath = path.join(this.outputDir, `${category}.html`);
    fs.writeFileSync(htmlPath, finalHTML);

    // Generate PDF
    const pdfPath = path.join(this.outputDir, `${category}.pdf`);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(finalHTML, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    
    console.log(`   ✅ Generated: ${pdfPath}`);
    return pdfPath;
  }

  async generateAll() {
    console.log('\n🚀 WorldClass ERP - Investor PDF Generator');
    console.log('===========================================\n');
    console.log(`📁 Output Directory: ${this.outputDir}\n`);

    const results = [];

    for (const [category, files] of Object.entries(DOCUMENT_CATEGORIES)) {
      try {
        const pdfPath = await this.generatePDF(category, files);
        results.push({ category, path: pdfPath, success: true });
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.push({ category, error: error.message, success: false });
      }
    }

    // Generate master index
    await this.generateIndexPDF(results);

    return results;
  }

  async generateIndexPDF(results) {
    console.log('\n📑 Generating master index...');

    const successList = results
      .filter(r => r.success)
      .map((r, i) => `
        <li class="toc-item">
          <span class="toc-number">${i + 1}.</span>
          <strong>${r.category.replace(/-/g, ' ')}</strong>
          <br><span style="color: #64748b; font-size: 12px; margin-left: 30px;">
            📄 ${path.basename(r.path)}
          </span>
        </li>
      `).join('');

    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <div class="cover-page">
        <div class="cover-logo">SiyaBusa ERP</div>
        <div class="cover-subtitle">Complete Documentation Package</div>
        <div class="cover-badges">
          <span class="badge">${results.filter(r => r.success).length} Documents</span>
          <span class="badge">Investor Ready</span>
          <span class="badge">Professional Format</span>
        </div>
        <div class="cover-date">Generated: ${date}</div>
      </div>
      
      <div class="toc-page">
        <h1 class="toc-title">Documentation Index</h1>
        <ul class="toc-list">
          ${successList}
        </ul>
        
        <div class="highlight-box" style="margin-top: 40px;">
          <h3 style="margin-top: 0;">📤 How to Use These Documents</h3>
          <ul>
            <li>Each PDF contains related documentation organized by topic</li>
            <li>Documents are professionally formatted for stakeholder presentations</li>
            <li>Share directly via WhatsApp, email, or cloud storage</li>
            <li>All content is investor and board-ready</li>
            <li>PDFs are optimized for both digital viewing and printing</li>
          </ul>
        </div>
        
        <div class="success-box" style="margin-top: 30px;">
          <h3 style="margin-top: 0;">✨ About SiyaBusa ERP</h3>
          <p>
            SiyaBusa ERP is a comprehensive, production-ready Enterprise Resource Planning system
            built with modern technologies. The system features 25+ integrated modules, 400+ REST APIs,
            multi-tenant architecture, and AI-powered assistance.
          </p>
          <p style="margin-bottom: 0;">
            <strong>Technology Stack:</strong> Node.js, TypeScript, React, PostgreSQL, Redis, AWS Cloud
          </p>
        </div>
      </div>
    `;

    const finalHTML = HTML_TEMPLATE
      .replace(/{{TITLE}}/g, 'SiyaBusa ERP - Documentation Index')
      .replace(/{{CATEGORY}}/g, 'Master Index')
      .replace('{{CONTENT}}', htmlContent);

    const pdfPath = path.join(this.outputDir, '00-INDEX.pdf');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(finalHTML, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    
    console.log(`   ✅ Generated: ${pdfPath}`);
  }
}

// Run if executed directly
if (require.main === module) {
  const generator = new InvestorPDFGenerator();
  
  generator.generateAll()
    .then((results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log('\n');
      console.log('===========================================');
      console.log('✨ PDF Generation Complete!');
      console.log('===========================================');
      console.log(`✅ ${successful} documents generated successfully`);
      if (failed > 0) {
        console.log(`⚠️  ${failed} documents failed`);
      }
      console.log(`📁 Location: ${generator.outputDir}`);
      console.log('\n📤 Ready to share on WhatsApp, email, or any platform!');
      console.log('');
    })
    .catch((error) => {
      console.error('\n❌ Generation failed:', error);
      process.exit(1);
    });
}

module.exports = InvestorPDFGenerator;
