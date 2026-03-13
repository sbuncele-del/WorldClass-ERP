/**
 * SocialProof — Animated metric counters strip
 * World-class pattern: hard numbers build credibility
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '../shared';

function useCounter(end: number, suffix: string, duration = 2000) {
  const [count, setCount] = useState(end);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          setCount(0);
          let start = 0;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return { display: `${count.toLocaleString()}${suffix}`, ref };
}

const SocialProof: React.FC = () => {
  const s1 = useCounter(10000, '+');
  const s2 = useCounter(2, 'M+');
  const s3 = useCounter(99, '%');
  const s4 = useCounter(17, '+');

  const stats = [
    { ...s1, label: 'Transactions Processed' },
    { ...s2, label: 'Revenue Under Management (ZAR)' },
    { ...s3, label: 'Regulatory Compliance Rate' },
    { ...s4, label: 'Integrated Modules' },
  ];

  return (
    <section className="social-proof">
      <motion.div
        className="social-proof-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {stats.map((stat, i) => (
          <motion.div key={i} className="proof-stat" variants={fadeInUp} ref={stat.ref}>
            <div className="proof-stat-value">
              <span className="accent">{stat.display}</span>
            </div>
            <div className="proof-stat-label">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default SocialProof;
