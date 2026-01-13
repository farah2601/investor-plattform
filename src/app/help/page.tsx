"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "../landing-styles.css";

type FAQItem = {
  question: string;
  answer: string;
};

type Category = {
  id: string;
  name: string;
  icon: React.ReactNode;
  faqs: FAQItem[];
};

const categories: Category[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    faqs: [
      {
        question: "How do I create my first company profile?",
        answer: "After signing up, you'll be redirected to the onboarding page where you can create your company profile. Fill in your company name, industry, stage, and description. You can always edit these details later from your company profile page.",
      },
      {
        question: "What KPIs should I track?",
        answer: "Valyxo supports common startup KPIs like MRR (Monthly Recurring Revenue), ARR, burn rate, runway, customer count, and more. Start with the metrics most relevant to your business stage and industry.",
      },
      {
        question: "How do I connect my data sources?",
        answer: "Navigate to the Integrations page from your dashboard. You can connect Google Sheets to automatically sync your metrics. More integrations are coming soon.",
      },
      {
        question: "Can I invite team members?",
        answer: "Yes! You can invite team members from your dashboard settings. Team members can help manage your investor relations and update company metrics.",
      },
      {
        question: "How do I share my dashboard with investors?",
        answer: "You can generate investor links from your dashboard. Each link is unique and can be shared directly with investors. You can revoke access at any time.",
      },
      {
        question: "What's the difference between founder and investor views?",
        answer: "Founders see the full dashboard with all metrics and can edit data. Investors see a read-only view with only the metrics you choose to share.",
      },
    ],
  },
  {
    id: "billing-plans",
    name: "Billing & Plans",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    faqs: [
      {
        question: "Is Valyxo free?",
        answer: "Valyxo is currently in early access and free for all users. We're gathering feedback to improve the product. We'll provide plenty of notice before any pricing changes.",
      },
      {
        question: "What happens when pricing launches?",
        answer: "Early access users will be grandfathered in with continued access. We'll share details about pricing plans and grandfathering benefits well in advance.",
      },
      {
        question: "Are there any usage limits?",
        answer: "Currently, there are no usage limits during early access. All features are available to all users.",
      },
      {
        question: "Can I upgrade or downgrade my plan?",
        answer: "Pricing plans are not yet available. When we launch pricing, you'll be able to manage your plan from your account settings.",
      },
      {
        question: "Do you offer refunds?",
        answer: "Since Valyxo is currently free, refunds are not applicable. When pricing launches, we'll have a clear refund policy.",
      },
    ],
  },
  {
    id: "integrations",
    name: "Integrations",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    faqs: [
      {
        question: "Which integrations are available?",
        answer: "Currently, Google Sheets integration is available. You can connect your Sheets to automatically sync metrics. We're working on additional integrations including QuickBooks, Stripe, and more.",
      },
      {
        question: "How do I connect Google Sheets?",
        answer: "Go to the Integrations page, click 'Connect' on Google Sheets, and authorize the connection. You'll be prompted to select which sheet and range to sync.",
      },
      {
        question: "How often does data sync?",
        answer: "Data syncs automatically on a schedule. You can also manually trigger a sync from the Integrations page. The sync frequency depends on your plan (details coming with pricing launch).",
      },
      {
        question: "Can I disconnect an integration?",
        answer: "Yes, you can disconnect any integration at any time from the Integrations page. Your data will remain in Valyxo, but automatic syncing will stop.",
      },
      {
        question: "Is my data secure when using integrations?",
        answer: "Yes, we use OAuth for secure connections and never store your integration credentials. All data is encrypted in transit and at rest.",
      },
      {
        question: "What data formats are supported?",
        answer: "For Google Sheets, we support common data formats including numbers, dates, and text. We automatically detect and parse common metric formats.",
      },
    ],
  },
  {
    id: "security-privacy",
    name: "Security & Privacy",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    faqs: [
      {
        question: "How is my data secured?",
        answer: "We use enterprise-grade security including encryption at rest and in transit, regular security audits, and SOC 2 compliance (in progress). Your data is stored in secure, redundant data centers.",
      },
      {
        question: "Who can see my data?",
        answer: "Only you and team members you explicitly invite can see your data. Investors only see what you choose to share through investor links. We never share your data with third parties.",
      },
      {
        question: "Can I export my data?",
        answer: "Yes, you can export your data at any time. Go to your account settings to download your data in standard formats.",
      },
      {
        question: "What happens if I delete my account?",
        answer: "When you delete your account, all your data is permanently removed from our systems within 30 days. You can request immediate deletion by contacting support.",
      },
      {
        question: "Do you comply with GDPR?",
        answer: "Yes, we comply with GDPR and other data protection regulations. You have full control over your data and can request access, correction, or deletion at any time.",
      },
      {
        question: "How do you handle data breaches?",
        answer: "In the unlikely event of a data breach, we'll notify affected users immediately and take all necessary steps to secure accounts and prevent further issues.",
      },
    ],
  },
  {
    id: "troubleshooting",
    name: "Troubleshooting",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    faqs: [
      {
        question: "My metrics aren't updating",
        answer: "Check that your integration is connected and syncing. If using manual entry, make sure you've saved your changes. Try refreshing the page or triggering a manual sync.",
      },
      {
        question: "I can't log in to my account",
        answer: "Make sure you're using the correct email address. If you've forgotten your password, use the 'Forgot Password' link on the login page. Check that cookies are enabled in your browser.",
      },
      {
        question: "Investor links aren't working",
        answer: "Verify that the link hasn't been revoked. Check that you're using the full URL. If issues persist, generate a new investor link from your dashboard.",
      },
      {
        question: "Data isn't syncing from Google Sheets",
        answer: "Ensure the Google Sheets integration is connected and authorized. Check that the sheet and range are correctly configured. Verify that the sheet is accessible and the data format is correct.",
      },
      {
        question: "The page is loading slowly",
        answer: "Try refreshing the page or clearing your browser cache. Check your internet connection. If the issue persists, contact support with details about what you're trying to do.",
      },
      {
        question: "I'm seeing incorrect data",
        answer: "Check your data sources to verify the source data is correct. If using integrations, trigger a manual sync. Review your metric configurations to ensure they're set up correctly.",
      },
      {
        question: "How do I reset my password?",
        answer: "Go to the login page and click 'Forgot Password'. Enter your email address and check your inbox for reset instructions. The link expires after 24 hours.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Flatten all FAQs for search
  const allFAQs = useMemo(() => {
    return categories.flatMap((category) =>
      category.faqs.map((faq) => ({
        ...faq,
        categoryId: category.id,
        categoryName: category.name,
      }))
    );
  }, []);

  // Filter FAQs based on search query
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return allFAQs;
    const query = searchQuery.toLowerCase();
    return allFAQs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query)
    );
  }, [searchQuery, allFAQs]);

  // Group filtered FAQs by category
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const categoryMap = new Map<string, Category>();
    filteredFAQs.forEach((faq) => {
      const category = categories.find((c) => c.id === faq.categoryId);
      if (category) {
        if (!categoryMap.has(category.id)) {
          categoryMap.set(category.id, { ...category, faqs: [] });
        }
        categoryMap.get(category.id)!.faqs.push({ question: faq.question, answer: faq.answer });
      }
    });
    return Array.from(categoryMap.values());
  }, [filteredFAQs, searchQuery]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission
    setFormSubmitted(true);
    setContactForm({ name: "", email: "", message: "" });
    setTimeout(() => setFormSubmitted(false), 5000);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleFAQ = (categoryId: string, question: string) => {
    const key = `${categoryId}-${question}`;
    setExpandedFAQ(expandedFAQ === key ? null : key);
  };

  return (
    <div className="relative bg-dark text-white min-h-screen" data-vtbot-replace="body">
      <Header />
      <main className="overflow-x-clip pt-[68px]">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-screen-xl px-4 pt-16 lg:pt-24 pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl lg:text-5xl font-medium mb-6">Help Center</h1>
            <p className="text-lg lg:text-xl text-white/80 max-w-2xl mx-auto">
              Find answers, guides, and support
            </p>
          </div>
        </section>

        {/* Search Bar */}
        <section className="relative mx-auto max-w-screen-xl px-4 pb-8">
          <div className="mx-auto max-w-2xl">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 bg-gradient-to-b from-black/50 to-black/30 border border-white/10 rounded-lg px-4 pr-12 text-white placeholder:text-white/50 focus:border-white/20"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        {!searchQuery.trim() && (
          <section className="relative mx-auto max-w-screen-xl px-4 pb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className="bg-gradient-to-b from-black/50 to-black/30 border border-white/10 rounded-lg p-6 text-left hover:border-white/20 hover:shadow-lg hover:shadow-black/30 transition-all group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-brand-blue group-hover:scale-110 transition-transform">
                      {category.icon}
                    </div>
                    <h2 className="text-xl font-medium">{category.name}</h2>
                  </div>
                  <p className="text-white/70 text-sm">
                    {category.faqs.length} {category.faqs.length === 1 ? "article" : "articles"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Accordion */}
        <section className="relative mx-auto max-w-screen-xl px-4 pb-16">
          <div className="mx-auto max-w-3xl space-y-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-gradient-to-b from-black/50 to-black/30 border border-white/10 rounded-lg p-6 lg:p-8"
              >
                <h2 className="text-2xl font-medium mb-6">{category.name}</h2>
                <div className="space-y-4">
                  {category.faqs.map((faq, index) => {
                    const faqKey = `${category.id}-${faq.question}`;
                    const isExpanded = expandedFAQ === faqKey;
                    return (
                      <div key={index} className="border-b border-white/10 last:border-0 pb-4 last:pb-0">
                        <button
                          onClick={() => toggleFAQ(category.id, faq.question)}
                          className="w-full text-left flex items-start justify-between gap-4 group"
                        >
                          <h3 className="text-lg font-medium text-white group-hover:text-white/90 transition-colors flex-1">
                            {faq.question}
                          </h3>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className={`w-5 h-5 text-white/50 shrink-0 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="mt-4 text-white/70 leading-relaxed">{faq.answer}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Support */}
        <section className="relative mx-auto max-w-screen-xl px-4 pb-24">
          <div className="mx-auto max-w-2xl">
            <div className="bg-gradient-to-b from-black/50 to-black/30 border border-white/10 rounded-lg p-8 lg:p-12">
              <h2 className="text-2xl font-medium mb-6">Contact Support</h2>
              {formSubmitted ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-green/20 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-8 h-8 text-brand-green"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg text-white/90 mb-2">Message sent successfully!</p>
                  <p className="text-white/70">We'll get back to you as soon as possible.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm text-white/90">Name</label>
                    <Input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) =>
                        setContactForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="bg-black/30 border-white/10 text-white placeholder:text-white/50"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/90">Email</label>
                    <Input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="bg-black/30 border-white/10 text-white placeholder:text-white/50"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/90">Message</label>
                    <textarea
                      required
                      value={contactForm.message}
                      onChange={(e) =>
                        setContactForm((f) => ({ ...f, message: e.target.value }))
                      }
                      rows={6}
                      className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-white/20 transition-colors resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
