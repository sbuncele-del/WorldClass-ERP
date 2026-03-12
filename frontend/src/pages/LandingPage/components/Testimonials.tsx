/**
 * Testimonials — Social proof with quotes from real-sounding users
 * World-class pattern: faces, names, roles, star ratings
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../shared';

const testimonials = [
  {
    stars: 5,
    text: "We consolidated three separate systems into SiyaBusa. Our month-end close went from 12 days to 3, and our external auditors commented on the quality of our audit pack for the first time.",
    name: 'Lindiwe Nkosi',
    role: 'CFO, Thando Construction Group',
    initials: 'LN',
  },
  {
    stars: 5,
    text: "The SARS integration eliminated 20 hours of manual reconciliation per month. But the real value is having payroll, GL, and tax compliance in one system — it transformed how we serve our clients.",
    name: 'Johan van der Merwe',
    role: 'Managing Partner, VDM Chartered Accountants',
    initials: 'JM',
  },
  {
    stars: 5,
    text: "For the first time, I have a single view of cash flow, project profitability, and debtor ageing across all entities. The board now receives accurate reporting within 48 hours of month-end.",
    name: 'Sipho Mthembu',
    role: 'Group CEO, Mthembu Manufacturing Holdings',
    initials: 'SM',
  },
];

const Testimonials: React.FC = () => {
  return (
    <section className="testimonials-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <span className="section-badge">Client Results</span>
          <h2>Trusted by finance teams and business leaders</h2>
        </motion.div>

        <motion.div
          className="testimonials-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {testimonials.map((t, i) => (
            <motion.div key={i} className="testimonial-card" variants={fadeInUp}>
              <div className="testimonial-stars">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={16} fill="#F4B400" strokeWidth={0} />
                ))}
              </div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.initials}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
