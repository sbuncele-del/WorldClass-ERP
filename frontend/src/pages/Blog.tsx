import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, User, TrendingUp, Shield, Cpu, BarChart3, Briefcase, Lightbulb, ArrowLeft, ChevronRight } from 'lucide-react';
import { WebsiteLayout, fadeInUp, staggerContainer } from './LandingPage/LandingPage';
import './FooterPages.css';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  icon: React.ReactNode;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Industry Insights': <TrendingUp size={18} />,
  'Compliance': <Shield size={18} />,
  'Financial Management': <BarChart3 size={18} />,
  'Operations': <Briefcase size={18} />,
  'Technology': <Cpu size={18} />,
  'Growth': <Lightbulb size={18} />,
  'SME Focus': <BookOpen size={18} />,
};

const blogPosts: BlogPost[] = [
  {
    id: 'erp-digital-transformation',
    title: 'Why ERP is the Foundation of Digital Transformation',
    excerpt: 'Discover how modern ERP systems are enabling businesses to transform their operations and compete in the digital age.',
    content: 'Digital transformation isn\'t just about adopting new technology — it\'s about fundamentally rethinking how your business operates. At the core of any successful transformation is an ERP system that integrates all your business processes into a single, intelligent platform.\n\nModern cloud ERP systems like SiyaBusa break down data silos by connecting finance, operations, HR, sales, and compliance into one unified system. When every department works from the same data, decisions become faster, more accurate, and more strategic.\n\nThe key benefits include real-time visibility across all operations, automated workflows that eliminate manual processes, predictive analytics powered by AI, and scalable infrastructure that grows with your business. South African companies that have embraced integrated ERP see an average 35% improvement in operational efficiency within the first year.\n\nThe message is clear: digital transformation without a solid ERP foundation is like building a house on sand. Start with the right platform, and everything else falls into place.',
    category: 'Industry Insights',
    date: 'December 5, 2025',
    readTime: '6 min read',
    author: 'SiyaBusa Team',
    icon: <TrendingUp size={18} />,
  },
  {
    id: 'popia-compliance-guide',
    title: 'POPIA Compliance: A Practical Guide for South African Businesses',
    excerpt: 'Understanding your obligations under the Protection of Personal Information Act and how to implement compliant processes.',
    content: 'The Protection of Personal Information Act (POPIA) has been fully enforceable since July 2021, yet many South African businesses are still not fully compliant. Non-compliance can result in fines of up to R10 million or imprisonment.\n\nKey POPIA requirements include: obtaining consent before processing personal information, implementing adequate security measures to protect data, appointing an Information Officer registered with the Information Regulator, and providing data subjects with access to their personal information.\n\nPractical steps to achieve compliance: Conduct a data audit to understand what personal information you hold and where it\'s stored. Implement proper access controls — not every employee needs access to all data. Use encryption for data at rest and in transit. Establish clear data retention policies and regularly purge unnecessary data.\n\nAn integrated ERP system like SiyaBusa helps by centralising data management, providing audit trails for every data access event, enforcing role-based permissions, and automating data retention rules. With built-in compliance features, you can focus on running your business while the system handles the regulatory complexity.',
    category: 'Compliance',
    date: 'November 28, 2025',
    readTime: '8 min read',
    author: 'Sibusiso Mavuso',
    icon: <Shield size={18} />,
  },
  {
    id: 'real-time-accounting',
    title: 'The Death of Month-End: Embracing Real-Time Accounting',
    excerpt: 'Why waiting until month-end to understand your financial position is costing your business — and how to fix it.',
    content: 'The traditional month-end close process is a relic of a time when accounting was done on paper. In the age of cloud computing and real-time data, there\'s no reason your financial position should be a mystery for 29 days out of 30.\n\nReal-time accounting means every transaction is recorded, categorised, and reflected in your reports the moment it happens. Bank feeds auto-import transactions. AI-powered categorisation reduces manual journal entries. Dashboards update in real time.\n\nThe benefits are transformative: Make decisions based on current data, not last month\'s numbers. Spot cash flow issues before they become crises. Identify profitable (and unprofitable) activities as they happen. Reduce month-end close from 2 weeks to 2 days.\n\nSouth African businesses using real-time accounting report 60% faster financial close processes and significantly improved cash flow management. The death of month-end isn\'t coming — it\'s already here for businesses ready to embrace it.',
    category: 'Financial Management',
    date: 'November 20, 2025',
    readTime: '5 min read',
    author: 'SiyaBusa Team',
    icon: <BarChart3 size={18} />,
  },
  {
    id: 'inventory-optimization',
    title: '5 Inventory Mistakes That Are Draining Your Cash Flow',
    excerpt: 'Common inventory management errors and practical strategies to optimize your stock levels and improve cash flow.',
    content: 'Inventory is often the largest asset on a business\'s balance sheet, yet it\'s one of the most poorly managed. Here are five common mistakes:\n\n1. **Overstocking "just in case"** — Fear of stockouts leads to excess inventory that ties up cash. Use demand forecasting based on historical data to set optimal reorder points.\n\n2. **Not tracking dead stock** — Products sitting on shelves for 6+ months are a hidden cost. Implement stock aging reports and create a clearance strategy.\n\n3. **Manual stock counts** — Annual or quarterly stocktakes are error-prone and disruptive. Use perpetual inventory systems with cycle counting instead.\n\n4. **Ignoring carrying costs** — The cost of holding inventory (storage, insurance, obsolescence) typically runs 20-30% of inventory value annually. Factor this into purchasing decisions.\n\n5. **No integration between sales and purchasing** — When sales data doesn\'t flow to purchasing, you end up with the wrong stock at the wrong time. Integrated ERP systems solve this by connecting your sales pipeline directly to procurement.\n\nThe solution isn\'t to hold less stock — it\'s to hold the right stock. Modern inventory management tools give you the visibility to make smarter decisions.',
    category: 'Operations',
    date: 'November 15, 2025',
    readTime: '7 min read',
    author: 'SiyaBusa Team',
    icon: <Briefcase size={18} />,
  },
  {
    id: 'ai-in-erp',
    title: 'How AI is Revolutionizing Enterprise Resource Planning',
    excerpt: 'From predictive analytics to automated workflows, explore how artificial intelligence is transforming ERP systems.',
    content: 'Artificial Intelligence isn\'t just a buzzword — it\'s fundamentally changing how ERP systems work. Here\'s what AI-powered ERP looks like in practice:\n\n**Intelligent Automation**: AI handles routine tasks like invoice matching, bank reconciliation, and expense categorisation. What used to take hours now happens in seconds with 99%+ accuracy.\n\n**Predictive Analytics**: Instead of looking at what happened last month, AI tells you what\'s likely to happen next month. Cash flow forecasting, demand prediction, and churn risk analysis become proactive tools rather than retrospective reports.\n\n**Natural Language Queries**: Ask your ERP "What were our top-selling products in Gauteng last quarter?" and get an instant answer. No more navigating complex report builders.\n\n**Anomaly Detection**: AI monitors thousands of transactions and flags unusual patterns — potential fraud, pricing errors, or process breakdowns — before they become problems.\n\nSiyaBusa\'s built-in AI Assistant brings these capabilities to every module, making enterprise-grade intelligence accessible to businesses of all sizes. The future of ERP isn\'t just about recording what happened — it\'s about predicting what\'s next.',
    category: 'Technology',
    date: 'November 8, 2025',
    readTime: '6 min read',
    author: 'SiyaBusa Team',
    icon: <Cpu size={18} />,
  },
  {
    id: 'scaling-with-erp',
    title: 'From Spreadsheets to Systems: When to Make the Switch',
    excerpt: 'Signs that your business has outgrown spreadsheets and how to transition to an integrated ERP system.',
    content: 'Every business starts with spreadsheets — and that\'s fine. But there comes a point where spreadsheets become a liability rather than an asset. Here are the signs:\n\n**You\'re spending more time managing data than using it.** When formula errors, version conflicts, and manual updates consume your team\'s time, you\'ve outgrown spreadsheets.\n\n**Your data lives in silos.** Sales has one spreadsheet, finance another, operations a third. Getting a unified view requires heroic manual effort.\n\n**Month-end takes longer each month.** As transaction volumes grow, the time to close the books grows exponentially with spreadsheets.\n\n**You can\'t trust your numbers.** Multiple versions, manual entry errors, and broken formulas mean you\'re never quite sure the reports are accurate.\n\n**You\'re hiring people to manage data instead of grow the business.** If you need a dedicated person just to maintain spreadsheets, that\'s a clear signal.\n\nThe transition doesn\'t have to be painful. Modern cloud ERP systems like SiyaBusa can import your existing data, and most businesses are fully operational within 2-4 weeks. The ROI typically shows within the first quarter through time savings alone.',
    category: 'Growth',
    date: 'November 1, 2025',
    readTime: '5 min read',
    author: 'SiyaBusa Team',
    icon: <Lightbulb size={18} />,
  },
  {
    id: 'sme-erp-myths',
    title: 'Debunking 7 ERP Myths That Hold SMEs Back',
    excerpt: 'Enterprise software isn\'t just for enterprises. We tackle common misconceptions about ERP for small and medium businesses.',
    content: '**Myth 1: "ERP is only for large corporations."** Modern cloud ERP is designed to scale. SiyaBusa serves businesses from 5 to 500+ employees.\n\n**Myth 2: "It\'s too expensive."** When you add up all the separate tools (accounting + payroll + inventory + CRM + projects), ERP is often cheaper. SiyaBusa starts at R399/user/month.\n\n**Myth 3: "Implementation takes years."** Cloud ERP can be deployed in weeks, not years. No hardware, no consultants billing for 18 months.\n\n**Myth 4: "We\'ll need to change how we work."** Good ERP adapts to your workflows, not the other way around. Configuration, not customisation.\n\n**Myth 5: "Our data isn\'t safe in the cloud."** Cloud infrastructure is typically more secure than on-premise servers. AES-256 encryption, automated backups, and 24/7 monitoring.\n\n**Myth 6: "It\'s too complex for our team."** If your team can use email and Excel, they can use modern ERP. Intuitive interfaces and built-in help make onboarding smooth.\n\n**Myth 7: "We can always switch later."** The longer you wait, the more data you accumulate in disconnected systems, making migration harder. The best time to switch is now.',
    category: 'SME Focus',
    date: 'October 25, 2025',
    readTime: '6 min read',
    author: 'SiyaBusa Team',
    icon: <BookOpen size={18} />,
  },
  {
    id: 'audit-ready',
    title: 'Audit-Ready: How Proper Systems Save You Time and Money',
    excerpt: 'Prepare for audits effortlessly by implementing proper controls and documentation from day one.',
    content: 'Audit season strikes fear into the hearts of many business owners — but it doesn\'t have to. The secret to a painless audit is having the right systems in place from day one.\n\n**The cost of audit unpreparedness:** Businesses without proper systems spend an average of 120+ hours preparing for annual audits. Add accountant fees for cleanup work, and you\'re looking at R50,000-R200,000 in avoidable costs.\n\n**What auditors actually want:** Complete and accurate transaction records with supporting documents. Proper segregation of duties and approval workflows. Consistent application of accounting policies. Evidence of internal controls and their effectiveness.\n\n**How ERP makes you audit-ready:** Every transaction creates an automatic audit trail — who did what, when, and why. Document attachments link source documents to transactions. Role-based access ensures proper segregation of duties. IAS/IFRS-compliant reports generate with one click.\n\n**The SiyaBusa advantage:** Our Audit-Ready Hub gives you a real-time compliance dashboard, showing exactly where you stand before the auditors arrive. Green means ready, amber means attention needed, red means action required. No more surprises.',
    category: 'Compliance',
    date: 'October 18, 2025',
    readTime: '7 min read',
    author: 'Sibusiso Mavuso',
    icon: <Shield size={18} />,
  }
];

const categories = ['All', 'Industry Insights', 'Compliance', 'Financial Management', 'Operations', 'Technology', 'Growth', 'SME Focus'];

/* ─── Individual Article Page ─── */
export const BlogArticle: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find(p => p.id === slug);

  if (!post) {
    return (
      <WebsiteLayout title="Article Not Found — SiyaBusa ERP" description="Article not found" canonical="https://siyabusaerp.co.za/insights">
        <section className="website-section" style={{ textAlign: 'center', padding: '120px 24px 80px' }}>
          <h1>Article Not Found</h1>
          <p style={{ marginTop: 16 }}>The article you're looking for doesn't exist.</p>
          <Link to="/insights" style={{ color: '#00B894', fontWeight: 600, marginTop: 24, display: 'inline-block' }}>
            <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Back to Insights
          </Link>
        </section>
      </WebsiteLayout>
    );
  }

  return (
    <WebsiteLayout
      title={`${post.title} — SiyaBusa ERP`}
      description={post.excerpt}
      canonical={`https://siyabusaerp.co.za/insights/${post.id}`}
    >
      <article className="insights-article-page">
        <div className="container">
          <Link to="/insights" className="insights-back-link">
            <ArrowLeft size={16} /> All Insights
          </Link>

          <div className="insights-article-header">
            <span className="insights-card-category" style={{ marginBottom: 16 }}>
              {categoryIcons[post.category]}
              {post.category}
            </span>
            <h1>{post.title}</h1>
            <div className="insights-article-meta">
              <span><User size={14} /> {post.author}</span>
              <span><Clock size={14} /> {post.readTime}</span>
              <span>{post.date}</span>
            </div>
          </div>

          <div className="insights-article-body">
            {post.content.split('\n\n').map((para, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            ))}
          </div>

          <div className="insights-article-cta">
            <h3>Want to learn more about SiyaBusa ERP?</h3>
            <p>Book a free personalised demo and see how we can help your business.</p>
            <Link to="/demo" className="btn-primary">Request a Demo</Link>
          </div>
        </div>
      </article>
    </WebsiteLayout>
  );
};

/* ─── Insights Listing Page ─── */
const Blog: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  const filteredPosts = selectedCategory === 'All' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  return (
    <WebsiteLayout title="Insights — SiyaBusa ERP" description="ERP insights, guides, and thought leadership from the SiyaBusa team. Stay ahead with articles on financial management, compliance, operations, and technology." canonical="https://siyabusaerp.co.za/insights">

      {/* Hero */}
      <section className="insights-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="insights-badge"><BookOpen size={14} /> Knowledge Hub</span>
            <h1>Insights</h1>
            <p className="insights-hero-sub">Thought leadership, practical guides, and expert perspectives on ERP, finance, compliance, and growing your business in South Africa.</p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="insights-filters-section">
        <div className="container">
          <div className="insights-filters">
            {categories.map(category => (
              <button
                key={category}
                className={`insights-filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category !== 'All' && categoryIcons[category]}
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="insights-articles">
        <div className="container">
          <motion.div className="insights-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {filteredPosts.map(post => (
              <motion.article
                key={post.id}
                className="insights-card"
                variants={fadeInUp}
                layout
              >
                <div className="insights-card-top">
                  <div className="insights-card-meta">
                    <span className="insights-card-category">
                      {categoryIcons[post.category]}
                      {post.category}
                    </span>
                    <span className="insights-card-date">{post.date}</span>
                  </div>
                  <h2>{post.title}</h2>
                  <p className="insights-card-excerpt">{post.excerpt}</p>
                </div>

                <div className="insights-card-bottom">
                  <div className="insights-card-author">
                    <User size={14} />
                    <span>{post.author}</span>
                    <Clock size={14} />
                    <span>{post.readTime}</span>
                  </div>
                  <Link
                    to={`/insights/${post.id}`}
                    className="insights-read-btn"
                  >
                    Read Article <ChevronRight size={14} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

    </WebsiteLayout>
  );
};

export default Blog;
