import { Link } from "react-router-dom";
import { Zap, ArrowLeft } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function PrivacyPolicy() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">
              Place<span className="text-primary-600">IT</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600">
              <ArrowLeft size={14} /> Back
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="card prose prose-sm dark:prose-invert max-w-none">

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Last updated: May 2025</p>

          <Section title="1. What We Collect">
            <p>When you use PlaceIT, we collect:</p>
            <ul>
              <li><strong>Account information</strong> — name, email address, password (hashed), role</li>
              <li><strong>Academic information</strong> (students) — CGPA, branch, graduation year, skills, experience</li>
              <li><strong>Company information</strong> — company name, industry, website</li>
              <li><strong>Resume files</strong> — uploaded PDFs/DOCX stored securely on Supabase Storage</li>
              <li><strong>Activity data</strong> — job applications, application status, interview schedules</li>
              <li><strong>Usage logs</strong> — actions taken on the platform (for audit purposes)</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Data">
            <ul>
              <li>To operate the placement portal and match students with job opportunities</li>
              <li>To run AI-powered candidate ranking based on resume content, skills, and CGPA</li>
              <li>To send email notifications about application status and interview schedules</li>
              <li>To provide analytics to administrators (placement officers) for institutional reporting</li>
              <li>To verify account authenticity and prevent fraudulent registrations</li>
            </ul>
          </Section>

          <Section title="3. AI Processing">
            <p>
              PlaceIT uses artificial intelligence to score and rank job applicants. The AI system processes your
              resume text, tagged skills, CGPA, and experience to generate a placement probability score.
              This score is used to assist — not replace — human hiring decisions. Companies see
              a breakdown of how each score was calculated (Skill Match, CGPA Score, ML Confidence).
            </p>
          </Section>

          <Section title="4. Data Sharing">
            <p>We do not sell your personal data. Your information is shared only:</p>
            <ul>
              <li>With companies you apply to (name, email, branch, CGPA, skills, resume URL)</li>
              <li>With your institution's placement administrator (all profile data)</li>
              <li>With third-party services we use: MongoDB Atlas (database), Supabase (file storage)</li>
            </ul>
            <p>Company profiles and job data are visible to all approved students on the platform.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your data for as long as your account is active. You may request deletion of your
              account and associated data by contacting the platform administrator. Resume files stored on
              Supabase are deleted when you upload a new resume or delete your account.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              Passwords are hashed using bcrypt (12 salt rounds) and never stored in plain text.
              All API communications use HTTPS. Authentication uses JWT tokens with expiry.
              We implement rate limiting, HTTP security headers (Helmet), and NoSQL injection prevention.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <ul>
              <li><strong>Access</strong> — view all data in your profile dashboard</li>
              <li><strong>Correction</strong> — update your profile information at any time</li>
              <li><strong>Deletion</strong> — contact admin to delete your account and data</li>
              <li><strong>Portability</strong> — export your application history via the dashboard</li>
            </ul>
          </Section>

          <Section title="8. Cookies">
            <p>
              PlaceIT does not use tracking cookies. We use localStorage to store your authentication
              token and theme preference only. No third-party advertising or analytics cookies are used.
            </p>
          </Section>

          <hr className="border-gray-200 dark:border-gray-700 my-8" />

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-8">Terms of Service</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Last updated: May 2025</p>

          <Section title="1. Acceptance">
            <p>
              By registering and using PlaceIT, you agree to these Terms of Service.
              If you do not agree, do not use the platform.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <ul>
              <li>Students must be currently enrolled at the institution using this portal</li>
              <li>Companies must be legitimate registered businesses</li>
              <li>All accounts require admin approval before access is granted</li>
              <li>Providing false information during registration will result in immediate account termination</li>
            </ul>
          </Section>

          <Section title="3. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Provide false CGPA, skills, or academic information</li>
              <li>Attempt to access other users' accounts or data</li>
              <li>Use automated tools to scrape or abuse the platform</li>
              <li>Post fraudulent job listings</li>
              <li>Misuse AI shortlisting scores to discriminate unlawfully</li>
            </ul>
          </Section>

          <Section title="4. AI Disclaimer">
            <p>
              The AI shortlisting scores are decision-support tools, not final decisions.
              PlaceIT does not guarantee placement outcomes. Scores are based on
              resume text similarity, skill matching, and ML predictions — they are
              indicative, not deterministic. Human review is always recommended before
              making final hiring decisions.
            </p>
          </Section>

          <Section title="5. Limitation of Liability">
            <p>
              PlaceIT is provided as-is for educational and placement purposes. We are not
              liable for placement outcomes, hiring decisions, or any consequential damages
              arising from use of the platform. The platform is offered free of charge
              and without warranty of uninterrupted service.
            </p>
          </Section>

          <Section title="6. Changes">
            <p>
              We may update these terms at any time. Continued use of the platform after
              changes constitutes acceptance of the new terms.
            </p>
          </Section>

          <Section title="7. Contact">
            <p>
              For privacy requests, data deletion, or questions about these terms,
              contact your institution's placement administrator.
            </p>
          </Section>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-8">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <span>© 2025 PlaceIT</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400">Home</Link>
            <Link to="/login" className="hover:text-primary-600 dark:hover:text-primary-400">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{title}</h2>
      <div className="text-gray-600 dark:text-gray-400 text-sm space-y-2 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
