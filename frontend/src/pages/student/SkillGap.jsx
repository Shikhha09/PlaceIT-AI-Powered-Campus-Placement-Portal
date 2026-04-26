import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { jobsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { ScoreBar, Spinner } from "../../components/common";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";

export default function SkillGap() {
  const { jobId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsAPI.getSkillGap(jobId)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950"><Navbar /><div className="flex justify-center py-20"><Spinner /></div></div>;
  if (!data) return null;

  const { job, student, analysis } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/student/jobs" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={14} /> Back to Jobs
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Skill Gap Analysis</h1>
        <p className="text-gray-500 text-sm mb-6">for <strong>{job.title}</strong></p>

        {/* Overall score */}
        <div className="card mb-6 text-center">
          <div className={`text-5xl font-bold mb-2 ${
            analysis.matchPercentage >= 75 ? "text-green-600" :
            analysis.matchPercentage >= 50 ? "text-yellow-600" : "text-red-600"
          }`}>
            {analysis.matchPercentage}%
          </div>
          <p className="text-gray-600 font-medium">Skill Match</p>

          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className={`flex items-center gap-1.5 ${analysis.cgpaEligible ? "text-green-600" : "text-red-600"}`}>
              {analysis.cgpaEligible ? <CheckCircle size={16} /> : <XCircle size={16} />}
              CGPA {student.cgpa} {analysis.cgpaEligible ? "≥" : "<"} Required {job.minCGPA}
            </div>
            <div className={`flex items-center gap-1.5 ${analysis.branchEligible ? "text-green-600" : "text-red-600"}`}>
              {analysis.branchEligible ? <CheckCircle size={16} /> : <XCircle size={16} />}
              Branch: {student.branch}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="card mb-6">
          <ScoreBar score={analysis.matchPercentage} label="Overall Match" />
        </div>

        {/* Matched skills */}
        <div className="card mb-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            Skills You Have ({analysis.matchedSkills.length})
          </h3>
          {analysis.matchedSkills.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">None matched yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analysis.matchedSkills.map((s) => (
                <span key={s} className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full font-medium">
                  ✓ {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Missing skills */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <XCircle size={18} className="text-red-500" />
            Skills to Learn ({analysis.missingSkills.length})
          </h3>
          {analysis.missingSkills.length === 0 ? (
            <p className="text-sm text-green-600 font-medium">🎉 You have all required skills!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analysis.missingSkills.map((s) => (
                <a
                  key={s}
                  href={`https://www.google.com/search?q=learn+${encodeURIComponent(s)}+tutorial`}
                  target="_blank" rel="noopener noreferrer"
                  className="bg-red-50 text-red-600 border border-red-200 text-sm px-3 py-1 rounded-full hover:bg-red-100 transition-colors"
                >
                  + {s} →
                </a>
              ))}
            </div>
          )}
          {analysis.missingSkills.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">Click any skill to find learning resources.</p>
          )}
        </div>

        {analysis.overallEligible && (
          <Link to="/student/jobs" className="btn-primary w-full text-center block">
            Apply for This Job
          </Link>
        )}
      </div>
    </div>
  );
}
